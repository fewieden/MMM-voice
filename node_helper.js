/* Magic Mirror
 * Module: MMM-voice
 *
 * By fewieden https://github.com/fewieden/MMM-voice
 * MIT Licensed.
 */

/* eslint-env node */

const Psc = require('pocketsphinx-continuous');
const fs = require('fs');
const exec = require('child_process').exec;
const lmtool = require('lmtool');
const bytes = require('./Bytes.js');
const NodeHelper = require('node_helper');

module.exports = NodeHelper.create({

    listening: false,
    mode: false,
    hdmi: true,
    help: false,
    words: [],

    start() {
        console.log(`Starting module helper: ${this.name}`);
        this.time = this.config.timeout * 1000;
    },

    socketNotificationReceived(notification, payload) {
        if (notification === 'START') {
            this.config = payload.config;
            this.modules = payload.modules;

            this.fillWords();
            this.checkFiles();
        }
    },

    fillWords() {
        // create array
        let words = this.config.keyword.split(' ');
        const temp = bytes.q.split(' ');
        words = words.concat(temp);
        for (let i = 0; i < this.modules.length; i += 1) {
            const mode = this.modules[i].mode.split(' ');
            words = words.concat(mode);
            for (let n = 0; n < this.modules[i].sentences.length; n += 1) {
                const sentences = this.modules[i].sentences[n].split(' ');
                words = words.concat(sentences);
            }
        }

        // filter duplicates
        words = words.filter((item, index, data) => data.indexOf(item) === index);

        // sort array
        words.sort();

        this.words = words;
    },

    checkFiles() {
        console.log(`${this.name}: Checking files.`);
        fs.stat('modules/MMM-voice/words.json', (error, stats) => {
            if (!error && stats.isFile()) {
                fs.readFile('modules/MMM-voice/words.json', 'utf8', (err, data) => {
                    if (!err) {
                        const words = JSON.parse(data).words;
                        if (this.arraysEqual(this.words, words)) {
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

    arraysEqual(a, b) {
        if (!(a instanceof Array) || !(b instanceof Array)) {
            return false;
        }

        if (a.length !== b.length) {
            return false;
        }

        for (let i = 0; i < a.length; i += 1) {
            if (a[i] !== b[i]) {
                return false;
            }
        }

        return true;
    },

    generateDicLM() {
        console.log(`${this.name}: Generating dictionairy and language model.`);

        fs.writeFile('modules/MMM-voice/words.json', JSON.stringify({ words: this.words }), (err) => {
            if (err) {
                console.log(`${this.name}: Couldn't save words.json!`);
            } else {
                console.log(`${this.name}: Saved words.json successfully.`);
            }
        });

        lmtool(this.words, (err, filename) => {
            if (err) {
                this.sendSocketNotification('ERROR', 'Couldn\'t create necessary files!');
            } else {
                fs.renameSync(`${filename}.dic`, 'modules/MMM-voice/MMM-voice.dic');
                fs.renameSync(`${filename}.lm`, 'modules/MMM-voice/MMM-voice.lm');

                this.startPocketsphinx();

                fs.unlink(`${filename}.log_pronounce`);
                fs.unlink(`${filename}.sent`);
                fs.unlink(`${filename}.vocab`);
                fs.unlink(`TAR${filename}.tgz`);
            }
        });
    },

    startPocketsphinx() {
        console.log(`${this.name}: Starting pocketsphinx.`);

        this.ps = new Psc({
            setId: this.name,
            verbose: true,
            microphone: this.config.microphone
        });

        this.ps.on('data', this.handleData);

        if (this.config.debug) {
            this.ps.on('debug', this.logDebug);
        }

        this.ps.on('error', this.logError);

        this.sendSocketNotification('READY');
    },

    handleData(data) {
        if (typeof data === 'string') {
            if (this.config.debug) {
                console.log(`${this.name} has recognized: ${data}`);
                this.sendSocketNotification('DEBUG', data);
            }
            if (data.includes(this.config.keyword) || this.listening) {
                this.listening = true;
                this.sendSocketNotification('LISTENING');
                if (this.timer) {
                    clearTimeout(this.timer);
                }
                this.timer = setTimeout(() => {
                    this.listening = false;
                    this.sendSocketNotification('SLEEPING');
                }, this.time);
            } else {
                return;
            }

            let cleanData = this.cleanData(data);

            for (let i = 0; i < this.modules.length; i += 1) {
                const n = cleanData.indexOf(this.modules[i].mode);
                if (n === 0) {
                    this.mode = this.modules[i].mode;
                    cleanData = cleanData.substr(n + this.modules[i].mode.length).trim();
                    break;
                }
            }

            if (this.mode) {
                this.sendSocketNotification('VOICE', { mode: this.mode, sentence: cleanData });
                if (this.mode === 'VOICE') {
                    this.checkCommands(cleanData);
                }
            }
        }
    },

    logDebug(data) {
        fs.appendFile('modules/MMM-voice/debug.log', data, (err) => {
            if (err) {
                console.log(`${this.name}: Couldn't save error to log file!`);
            }
        });
    },

    logError(error) {
        if (error) {
            fs.appendFile('modules/MMM-voice/error.log', `${error}\n`, (err) => {
                if (err) {
                    console.log(`${this.name}: Couldn't save error to log file!`);
                }
                this.sendSocketNotification('ERROR', error);
            });
        }
    },

    cleanData(data) {
        let temp = data;
        const i = temp.indexOf(this.config.keyword);
        if (i !== -1) {
            temp = temp.substr(i + this.config.keyword.length);
        }
        temp = temp.replace(/ {2,}/g, ' ').trim();
        return temp;
    },

    checkCommands(data) {
        if (bytes.r[0].test(data) && bytes.r[1].test(data)) {
            this.sendSocketNotification('BYTES', bytes.a);
        } else if (/(WAKE)/g.test(data) && /(UP)/g.test(data)) {
            exec('/opt/vc/bin/tvservice -p && sudo chvt 6 && sudo chvt 7', null);
            this.hdmi = true;
        } else if (/(GO)/g.test(data) && /(SLEEP)/g.test(data)) {
            exec('/opt/vc/bin/tvservice -o', null);
            this.hdmi = false;
        } else if (/(SHOW)/g.test(data) && /(MODULES)/g.test(data)) {
            this.sendSocketNotification('SHOW');
        } else if (/(HIDE)/g.test(data) && /(MODULES)/g.test(data)) {
            this.sendSocketNotification('HIDE');
        } else if (/(HELP)/g.test(data)) {
            if (/(CLOSE)/g.test(data) || (this.help && !/(OPEN)/g.test(data))) {
                this.sendSocketNotification('CLOSE_HELP');
                this.help = false;
            } else if (/(OPEN)/g.test(data) || (!this.help && !/(CLOSE)/g.test(data))) {
                this.sendSocketNotification('OPEN_HELP');
                this.help = true;
            }
        }
    }
});
