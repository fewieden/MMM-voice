/* Magic Mirror
 * Module: MMM-voice
 *
 * By fewieden https://github.com/fewieden/MMM-voice
 * MIT Licensed.
 */

const Psc = require("pocketsphinx-continuous");
const fs = require("fs");
const exec = require("child_process").exec;
const lmtool = require("lmtool");
const bytes = require("./Bytes.js");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    listening: false,
    mode: false,
    hdmi: true,
    help: false,
    words: [],

    socketNotificationReceived: function(notification, payload){
        if(notification === "START"){
            this.config = payload.config;
            this.modules = payload.modules;

            this.fillWords();
            this.checkFiles();
        }
    },

    fillWords: function(){
        //create array
        var array = this.config.keyword.split(" ");
        var temp = bytes.q.split(" ");
        for(var i = 0; i < temp.length; i++){
            array.push(temp[i]);
        }
        for(var i = 0; i < this.modules.length; i++){
            var mode = this.modules[i].mode.split(" ");
            for(var m = 0; m < mode.length; m++){
                array.push(mode[m]);
            }
            for(var n = 0; n < this.modules[i].sentences.length; n++){
                var sentence = this.modules[i].sentences[n].split(" ");
                for(var x = 0; x < sentence.length; x++){
                    array.push(sentence[x]);
                }
            }
        }

        // sort array
        array.sort();

        //filter duplicates
        var i = 0;
        while(i < array.length) {
            if(array[i] === array[i+1]) {
                array.splice(i+1,1);
            } else {
                i += 1;
            }
        }

        this.words = array;
    },

    checkFiles: function(){
        console.log("MMM-voice: Checking files.");
        fs.stat("modules/MMM-voice/words.json", (err, stats) => {
            if(!err && stats.isFile()){
                fs.readFile("modules/MMM-voice/words.json", "utf8", (err, data) => {
                    if(!err){
                        var words = JSON.parse(data).words;
                        if(this.arraysEqual(this.words, words)){
                            this.startPocketsphinx();
                            return;
                        }
                    }
                    this.generateDicLM();
                });
            } else {
                this.generateDicLM();
            }
        });
    },

    arraysEqual: function(a, b){
        if(! (a instanceof Array) || ! (b instanceof Array)){
            return false;
        }

        if(a.length !== b.length){
            return false;
        }

        for (var i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }

        return true;
    },

    generateDicLM: function(){
        console.log("MMM-voice: Generating dictionairy and language model.");

        fs.writeFile("modules/MMM-voice/words.json", JSON.stringify({words: this.words}), (err) => {
            if (err){
                console.log("MMM-voice: Couldn't save words.json!");
            } else {
                console.log("MMM-voice: Saved words.json successfully.");
            }
        });

        lmtool(this.words, (err, filename) => {
            if(err){
                this.sendSocketNotification("ERROR", "Couldn't create necessary files!");
            } else {
                fs.renameSync(filename + ".dic", "modules/MMM-voice/MMM-voice.dic");
                fs.renameSync(filename + ".lm", "modules/MMM-voice/MMM-voice.lm");

                this.startPocketsphinx();

                fs.unlink(filename + ".log_pronounce");
                fs.unlink(filename + ".sent");
                fs.unlink(filename + ".vocab");
                fs.unlink("TAR" + filename + ".tgz");
            }
        });
    },

    startPocketsphinx: function(){
        console.log("MMM-voice: Starting pocketsphinx.");
        this.time = this.config.timeout * 1000;
        this.ps = new Psc({
            setId: "MMM-voice",
            verbose: true,
            microphone: this.config.microphone
        });

        this.ps.on("data", (data) => {
            if(typeof data === "string"){
                if(this.config.debug){
                    console.log(data);
                    this.sendSocketNotification("DEBUG", data);
                }
                if(data.indexOf(this.config.keyword) !== -1 || this.listening){
                    this.listening = true;
                    this.sendSocketNotification("LISTENING");
                    if(this.timer){
                        clearTimeout(this.timer);
                    }
                    this.timer = setTimeout(() => {
                        this.listening = false;
                        this.sendSocketNotification("SLEEPING");
                    }, this.time);
                } else {
                    return;
                }

                data = this.cleanData(data);

                for(var i = 0; i < this.modules.length; i++){
                    var n = data.indexOf(this.modules[i].mode);
                    if(n === 0){
                        this.mode = this.modules[i].mode;
                        data = data.substr(n + this.modules[i].mode.length).trim();
                        break;
                    }
                }

                if(this.mode){
                    this.sendSocketNotification("VOICE", {mode: this.mode, sentence: data});
                    if(this.mode === "VOICE"){
                        this.checkCommands(data);
                    }
                }
            }
        });

        if(this.config.debug){
            this.ps.on("debug", (data) => {
                fs.appendFile("modules/MMM-voice/debug.log", data);
            });
        }

        this.ps.on("error", (error) => {
            if(error){
                fs.appendFile("modules/MMM-voice/error.log", error);
                this.sendSocketNotification("ERROR", error);
            }
        });

        this.sendSocketNotification("READY");
    },

    cleanData: function(data){
        var i = data.indexOf(this.config.keyword);
        if (i !== -1) {
            data = data.substr(i + this.config.keyword.length);
        }
        data = data.replace(/  +/g, " ").trim();
        return data;
    },

    checkCommands: function(data){
        if(bytes.r[0].test(data) && bytes.r[1].test(data)){
            this.sendSocketNotification("BYTES", bytes.a);
        } else if(/(TURN)/g.test(data)){
            if(/(ON)/g.test(data) || !this.hdmi && !/(OFF)/g.test(data)){
                exec("/opt/vc/bin/tvservice -p && sudo chvt 6 && sudo chvt 7", null);
                this.hdmi = true;
            } else if(/(OFF)/g.test(data) || this.hdmi && !/(ON)/g.test(data)){
                exec("/opt/vc/bin/tvservice -o", null);
                this.hdmi = false;
            }
        } else if(/(HIDE)/g.test(data)){
            this.sendSocketNotification("HIDE");
        } else if(/(SHOW)/g.test(data)){
            this.sendSocketNotification("SHOW");
        } else if(/(HELP)/g.test(data)){
            if(/(OPEN)/g.test(data) || !this.help && !/(CLOSE)/g.test(data)){
                this.sendSocketNotification("OPEN_HELP");
                this.help = true;
            } else if(/(CLOSE)/g.test(data) || this.help && !/(OPEN)/g.test(data)){
                this.sendSocketNotification("CLOSE_HELP");
                this.help = false;
            }
        }
    }
});