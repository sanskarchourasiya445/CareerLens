const mongoose = require('mongoose')


const blacklistTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [ true, "token is required to be added in blacklist" ],
        index: true
    }
}, {
    timestamps: true
})

// Automatically remove blacklisted tokens after 24 hours (86400 seconds) matching token lifetime
blacklistTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 })

const tokenBlacklistModel = mongoose.model("blacklistTokens", blacklistTokenSchema)

module.exports = tokenBlacklistModel