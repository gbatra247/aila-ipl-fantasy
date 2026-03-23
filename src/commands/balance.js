const { getUser } = require('../db');

module.exports = async function balance({ userPhone }) {
  const user = await getUser(userPhone);
  if (!user) {
    return '❌ Register first! Type *!register <your name>*';
  }

  const bal = parseFloat(user.balance);
  const status = bal >= 100 ? '🟢 Doing great!' : bal >= 50 ? '🟡 Holding steady' : bal > 0 ? '🟠 Running low' : '🔴 Broke!';

  let text = `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 *${user.display_name}'s Wallet*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `   💵 *$${bal.toFixed(2)}*\n`;
  text += `   ${status}\n\n`;
  text += `━━━━━━━━━━━━━━━━━━━━`;

  return text;
};
