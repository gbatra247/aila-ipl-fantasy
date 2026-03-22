const { getUser } = require('../db');

module.exports = async function balance({ userPhone }) {
  const user = await getUser(userPhone);
  if (!user) {
    return '❌ You need to register first! Type *!register <your name>*';
  }

  return `💰 *${user.display_name}*\nBalance: *$${parseFloat(user.balance).toFixed(2)}*`;
};
