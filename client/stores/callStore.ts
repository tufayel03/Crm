import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { connectSocket, getSocket, disconnectSocket } from '../utils/socket';

export type CallStatus = 'idle' | 'incoming' | 'outgoing' | 'connected' | 'ended';

interface CallPartner {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface CallState {
  status: CallStatus;
  partner: CallPartner | null;
  isVideo: boolean;
  isMuted: boolean;
  isCamOff: boolean;
  startTime: number | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;

  connect: (userId: string) => void;
  disconnect: () => void;
  initiateCall: (partner: CallPartner, video?: boolean) => void;
  receiveIncomingCall: (partner: CallPartner, video?: boolean, offer?: RTCSessionDescriptionInit) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCam: () => void;

  onCallAccepted: (answer: RTCSessionDescriptionInit) => void;
  onCallRejected: () => void;
  onCallIce: (candidate: RTCIceCandidateInit) => void;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ]
};

const maybeAddTurn = () => {
  const url = import.meta.env.VITE_TURN_URL;
  const user = import.meta.env.VITE_TURN_USER;
  const pass = import.meta.env.VITE_TURN_PASS;
  if (url && user && pass) {
    rtcConfig.iceServers?.push({ urls: [url], username: user, credential: pass });
  }
};
maybeAddTurn();

let peer: RTCPeerConnection | null = null;
let pendingOffer: RTCSessionDescriptionInit | null = null;

const createPeer = (partnerId: string) => {
  const socket = getSocket();
  if (!socket) return null;

  peer = new RTCPeerConnection(rtcConfig);

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('call:ice', { targetId: partnerId, candidate: event.candidate });
    }
  };

  peer.ontrack = (event) => {
    const [stream] = event.streams;
    useCallStore.setState({ remoteStream: stream });
  };

  return peer;
};

export const useCallStore = create<CallState>((set, get) => ({
  status: 'idle',
  partner: null,
  isVideo: false,
  isMuted: false,
  isCamOff: false,
  startTime: null,
  localStream: null,
  remoteStream: null,
  error: null,

  connect: (userId) => {
    const socket = connectSocket(userId);
    if (!socket) return;
    socket.on('call:request', async (payload: any) => {
      if (!payload) return;
      pendingOffer = payload.offer;
      get().receiveIncomingCall(payload.caller, payload.video, payload.offer);
    });

    socket.on('call:answer', async (payload: any) => {
      if (payload?.answer) {
        get().onCallAccepted(payload.answer);
      }
    });

    socket.on('call:ice', async (payload: any) => {
      if (payload?.candidate) {
        get().onCallIce(payload.candidate);
      }
    });

    socket.on('call:end', () => {
      get().endCall();
    });
  },

  disconnect: () => {
    disconnectSocket();
  },

  initiateCall: async (partner, video = false) => {
    const socket = getSocket();
    if (!socket) return;

    set({
      status: 'outgoing',
      partner,
      isVideo: video,
      isCamOff: !video,
      isMuted: false,
      error: null,
      remoteStream: null
    });

    try {
      if (!window.isSecureContext) {
        throw new Error('Calls require HTTPS or localhost for microphone/camera access.');
      }
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      set({ localStream });

      const pc = createPeer(partner.id);
      if (!pc) return;
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const currentUser = useAuthStore.getState().user;
      socket.emit('call:request', {
        targetId: partner.id,
        caller: {
          id: currentUser?.id,
          name: currentUser?.name,
          role: currentUser?.role,
          avatar: currentUser?.avatar
        },
        video,
        offer
      });
    } catch (err: any) {
      set({ status: 'idle', error: err?.message || 'Failed to start call' });
      return;
    }

    setTimeout(() => {
      const { status } = get();
      if (status === 'outgoing') {
        get().endCall();
      }
    }, 45000);
  },

  receiveIncomingCall: (partner, video = false) => {
    if (get().status === 'idle') {
      set({ status: 'incoming', partner, isVideo: video, isCamOff: !video, error: null });
    }
  },

  acceptCall: async () => {
    const socket = getSocket();
    const partner = get().partner;
    if (!socket || !partner || !pendingOffer) {
      set({ error: 'Call offer missing. Ask caller to retry.', status: 'idle', partner: null });
      return;
    }

    try {
      if (!window.isSecureContext) {
        throw new Error('Calls require HTTPS or localhost for microphone/camera access.');
      }
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: get().isVideo });
      set({ localStream });

      const pc = createPeer(partner.id);
      if (!pc) return;
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer', { targetId: partner.id, answer });

      set({ status: 'connected', startTime: Date.now(), error: null });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to accept call', status: 'idle', partner: null });
    }
  },

  rejectCall: () => {
    const socket = getSocket();
    const partner = get().partner;
    if (socket && partner) {
      socket.emit('call:end', { targetId: partner.id });
    }
    set({ status: 'ended', error: null });
    setTimeout(() => set({ status: 'idle', partner: null, localStream: null, remoteStream: null, startTime: null }), 1000);
  },

  endCall: () => {
    const socket = getSocket();
    const partner = get().partner;
    if (socket && partner) {
      socket.emit('call:end', { targetId: partner.id });
    }
    if (peer) {
      peer.close();
      peer = null;
    }
    const localStream = get().localStream;
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    set({ status: 'ended', startTime: null, localStream: null, remoteStream: null, error: null });
    setTimeout(() => set({ status: 'idle', partner: null }), 1000);
  },

  toggleMute: () => {
    const localStream = get().localStream;
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    }
    set((state) => ({ isMuted: !state.isMuted }));
  },

  toggleCam: () => {
    const localStream = get().localStream;
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    }
    set((state) => ({ isCamOff: !state.isCamOff }));
  },

  onCallAccepted: async (answer) => {
    if (!peer || !answer) return;
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
    set({ status: 'connected', startTime: Date.now() });
  },

  onCallRejected: () => {
    get().endCall();
  },

  onCallIce: async (candidate) => {
    if (!peer || !candidate) return;
    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // ignore
    }
  }
}));
