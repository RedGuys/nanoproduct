const app = require('express')();
const express = require('express');
const mongoose = require('mongoose');
const UUID = require('uuid');
const cron = require('node-cron');
const fs = require('fs');

let User = mongoose.model('User', new mongoose.Schema({
    id: String,
    phone: String,
    name: String,
}));
let Doctor = mongoose.model('Doctor', new mongoose.Schema({
    id: String,
    name: String,
    spec: String,
}));
let Slot = mongoose.model('Slot', new mongoose.Schema({
    id: String,
    user_id: String,
    doctor_id: String,
    date: Number
}));

app.get('/', (req, res) => {
    res.send("Api server is running!");
});

app.get('/doctors', async (req, res) => {
    let doctors = await Doctor.find();
    res.send(doctors.map(doctor => ({id: doctor.id, name: doctor.name, spec: doctor.spec})));
});

app.post('/doctor', express.json());
app.post('/doctor', async (req, res) => {
    let id = UUID.v4();
    while ((await Doctor.exists({id}))) {
        id = UUID.v4();
    }
    await new Doctor({id, name: req.body.name, spec: req.body.spec}).save();
    res.send({id, name: req.body.name, spec: req.body.spec});
});

app.delete("/doctor/:id", async (req, res) => {
    await Doctor.deleteOne({id: req.params.id});
    await Slot.deleteMany({doctor_id: req.params.id});
    res.send({status: "ok"});
});

app.get('/slots', async (req, res) => {
    let slots = await Slot.find();
    res.send(slots.map(slot => ({id: slot.id,user_id: slot.user_id, doctor_id: slot.doctor_id, date: slot.date})));
});

app.get('/slots/:doctor_id', async (req, res) => {
    let slots = await Slot.find({doctor_id: req.params.doctor_id});
    res.send(slots.map(slot => ({id: slot.id,user_id: slot.user_id, doctor_id: slot.doctor_id, date: slot.date})));
});

app.post('/slot', express.json());
app.post('/slot', async (req, res) => {
    if (!await Doctor.exists({id: req.body.doctor_id})) {
        res.status(400).send({error: "Doctor not found"});
        return;
    }
    let id = UUID.v4();
    while ((await Slot.exists({id}))) {
        id = UUID.v4();
    }
    await new Slot({id, user_id: null, doctor_id: req.body.doctor_id, date: req.body.date}).save();
    res.send({id, user_id: null, doctor_id: req.body.doctor_id, date: req.body.date});
});

app.delete("/slot/:id", async (req, res) => {
    await Slot.deleteOne({id: req.params.id});
    res.send({status: "ok"});
});

app.get('/users', async (req, res) => {
    let users = await User.find();
    res.send(users.map(user => ({id: user.id, phone: user.phone, name: user.name})));
});

app.post('/user', express.json());
app.post('/user', async (req, res) => {
    let id = UUID.v4();
    while ((await User.exists({id}))) {
        id = UUID.v4();
    }
    await new User({id, phone: req.body.phone, name: req.body.name}).save();
    res.send({id, phone: req.body.phone, name: req.body.name});
});

app.delete("/user/:id", async (req, res) => {
    await User.deleteOne({id: req.params.id});
    await Slot.updateMany({user_id: req.params.id}, {user_id: null});
    res.send({status: "ok"});
});

app.post('/slot/register', express.json());
app.post('/slot/register', async (req, res) => {
    if (!await Slot.exists({id: req.body.slot_id, user_id: null})) {
        res.status(400).send({error: "Slot not found"});
        return;
    }
    if (!await User.exists({id: req.body.user_id})) {
        res.status(400).send({error: "User not found"});
        return;
    }
    if (!await Doctor.exists({id: req.body.doctor_id})) {
        res.status(400).send({error: "Doctor not found"});
        return;
    }
    let slot = await Slot.findOne({id: req.body.slot_id});
    slot.user_id = req.body.user_id;
    await slot.save();
    res.send({id: slot.id, user_id: slot.user_id, doctor_id: slot.doctor_id, date: slot.date});
});

app.post('/slot/unregister', express.json());
app.post('/slot/unregister', async (req, res) => {
    if (!await Slot.exists({id: req.body.slot_id})) {
        res.status(400).send({error: "Slot not found"});
        return;
    }
    let slot = await Slot.findOne({id: req.body.slot_id});
    slot.user_id = null;
    await slot.save();
    res.send({id: slot.id, user_id: slot.user_id, doctor_id: slot.doctor_id, date: slot.date});
});

cron.schedule('0 9 * * *', async () => {
    let slots = await Slot.find({date: {$gt: Date.now()/1000 + 24 * 60 * 60, $lt: Date.now()/1000 + 2 * 24 * 60 * 60}, user_id: {$ne: null}});
    let write = fs.createWriteStream('sms.log', {flags: 'a'});
    for (let slot of slots) {
        let user = await User.findOne({id: slot.user_id});
        let doctor = await Doctor.findOne({id: slot.doctor_id});
        let date = new Date(slot.date*1000);
        let now = new Date();
        let current_date = pad(now.getDate(),2) + "." + pad(now.getMonth() + 1,2) + "." + pad(now.getFullYear(),4) + " " + pad(now.getHours(),2) + ":" + pad(now.getMinutes(),2) + ":" + pad(now.getSeconds(),2);
        write.write(`${ current_date } | Привет ${ user.name }! Напоминаем что вы записаны к ${ doctor.spec } завтра в ${ pad(date.getHours(),2) + ":" + pad(date.getMinutes(),2) }!\n`);
    }
    write.end();
});

cron.schedule('0 * * * *', async () => {
    let slots = await Slot.find({date: {$gt: Date.now()/1000 + 2 * 60 * 60, $lt: Date.now()/1000 + 3 * 60 * 60}, user_id: {$ne: null}});
    let write = fs.createWriteStream('sms.log', {flags: 'a'});
    for (let slot of slots) {
        let user = await User.findOne({id: slot.user_id});
        let doctor = await Doctor.findOne({id: slot.doctor_id});
        let date = new Date(slot.date*1000);
        let now = new Date();
        let current_date = pad(now.getDate(),2) + "." + pad(now.getMonth() + 1,2) + "." + pad(now.getFullYear(),4) + " " + pad(now.getHours(),2) + ":" + pad(now.getMinutes(),2) + ":" + pad(now.getSeconds(),2);
        write.write(`${ current_date } | Привет ${ user.name }! Вам через 2 часа к ${ doctor.spec } в ${ pad(date.getHours(),2) + ":" + pad(date.getMinutes(),2) }!\n`);
    }
    write.end();
});

function pad(num, size) {
    num = num.toString();
    while (num.length < size) num = "0" + num;
    return num;
}

//start server only if connected to database successfully
mongoose.connect(process.env.MONGO_URL, {useNewUrlParser: true})
    .then(() => {
        app.listen(3000, () => {
            console.log("App started!");
        });
    });