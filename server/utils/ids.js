const generateShortId = () => Math.random().toString(36).substring(2, 7).toUpperCase();

const generateUniqueShortId = async (Model, field = 'shortId') => {
  let shortId = generateShortId();
  let exists = await Model.findOne({ [field]: shortId });
  while (exists) {
    shortId = generateShortId();
    exists = await Model.findOne({ [field]: shortId });
  }
  return shortId;
};

module.exports = { generateShortId, generateUniqueShortId };

