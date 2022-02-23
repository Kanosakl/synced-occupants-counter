const mongoose = require('mongoose')
const Schema = mongoose.Schema

const events = new Schema({
    name: String,
    occupants: Number,
    totalAttendees: Number
})

const Events = mongoose.model('Event', events)

module.exports = {
    Events,
    mongoose
}