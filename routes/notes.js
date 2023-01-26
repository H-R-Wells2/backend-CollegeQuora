const { Router } = require("express");
const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const { body, validationResult } = require('express-validator');
const fetchuser = require("../middleware/fetchuser");



// ROUTE 1 : Get all notes of loggedin user using: GET "api/notes/getuser". Login required.
router.get('/fetchallnotes', fetchuser, async (req, res) => {
    try {
        const notes = await Note.find({ user: req.user.id });
        res.json(notes);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }

})












// ROUTE 2 : Add notes of loggedin user using: POST "api/notes/addnote". Login required.
router.post('/addnote', fetchuser, [
    body('title', 'Enter a valid title').isLength({ min: 3 }),
    body('description', 'Enter a valid title').isLength({ min: 3 }),
], async (req, res) => {
    const { title, description, tag } = req.body;

    try {

        // If there are errors , return bad request and errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const note = new Note({
            title, description, tag, user: req.user.id
        });
        const savedNote = await note.save();

        res.json(savedNote);

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }

})










// ROUTE 3 : Update an existing note of loggedin user using: PUT "api/notes/updatenote". Login required.
router.put('/updatenote/:id', fetchuser, async (req, res) => {
    const { title, description, tag } = req.body;

    try {

        // Create newNote object
        const newNote = {};
        if (title) {
            newNote.title = title;
        }
        if (description) {
            newNote.description = description;
        }
        if (tag) {
            newNote.tag = tag;
        }


        // Find the note which want to update and update it.
        let note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).send("Sorry Not Found")
        };
        // Allow to update only if user owns this note
        if (note.user.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed")
        }

        note = await Note.findByIdAndUpdate(req.params.id, { $set: newNote }, { new: true });
        res.json({ note });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }


})












// ROUTE 4 : Delete a note of loggedin user using: DELETE "api/notes/deletenote". Login required.
router.delete('/deletenote/:id', fetchuser, async (req, res) => {

    try {

        // Find the note which want to delete and delete it.
        let note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).send("Sorry Not Found")
        };

        // Allow deletion only if user owns this note
        if (note.user.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed")
        }

        note = await Note.findByIdAndDelete(req.params.id);
        res.json({ "Success": "Note has been deleted", note: note });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }


})

module.exports = router