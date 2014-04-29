
var mongoose = require('mongoose')
var Schema = mongoose.Schema

var pkgArch = ["x86", "x86_64", "noarch"]
var depCondition = ["atleast", "any"]
var pkgTags = ["dev-util", "develop"]

exports.packageSchema = new Schema({
    _id: Schema.Types.ObjectId,
    _rev: Number,
    add_date: Date,
    arch: { type: String, enum: pkgArch },
    build: Number,
    compressed_size: Number,
    dependencies: [{
        name: { type: String, trim: true },
        condition: { type: String, enum: depCondition },
        version: { type: String, trim: true }
    }],
    description: String,
    filename: String,
    installed_size: Number,
    location: String,
    maintainer: { name: String, email: String },
    md5: String,
    name: { type: String, trim: true },
    repositories: [{
        repository: String,
        osversion: String,
        branch: String,
        subgroup: String
    }],
    short_description: String,
    suggests: [ ],
    tags: [{ type: String, enum: pkgTags }],
    version: String
})
