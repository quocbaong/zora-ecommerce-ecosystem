require('dotenv').config();
const reportModel = require('./src/models/reportModel');

const resetUser = async () => {
    try {
        const userId = 'e75ceaf4-c7ad-49d2-971a-5b50d0bfdf18';
        await reportModel.updateUserMetadata(userId, {
            violationCount: 0,
            banned: false,
            bannedAt: null,
            accountStatus: "ACTIVE",
            mutedUntil: null
        });
        console.log('User reset successfully in DynamoDB');
    } catch (e) {
        console.error(e);
    }
};

resetUser();
