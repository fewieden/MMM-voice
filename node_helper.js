/**
 * @file node_helper.js
 *
 * @author fewieden
 * @license MIT
 *
 * @see  https://github.com/fewieden/MMM-voice
 */

/**
 * @external pocketsphinx-continuous
 * @see https://github.com/fewieden/pocketsphinx-continuous-node
 */
const Psc = require('pocketsphinx-continuous');

/**
 * @external fs
 * @see https://nodejs.org/api/fs.html
 */
const fs = require('fs');

/**
 * @external child_process
 * @see https://nodejs.org/api/child_process.html
 */
const exec = require('child_process').exec;

/**
 * @external lmtool
 * @see https://www.npmjs.com/package/lmtool
 */
const lmtool = require('lmtool');

/**
 * @module Bytes
 * @description Pure Magic
 */
const bytes = require('./Bytes.js');

/**
 * @external node_helper
 * @see https://github.com/MichMich/MagicMirror/blob/master/modules/node_modules/node_helper/index.js
 */
const NodeHelper = require('node_helper');

/**
 * @module node_helper
 * @description Backend for the module to query data from the API providers.
 *
 * @requires external:pocketsphinx-continuous
 * @requires external:fs
 * @requires external:child_process
 * @requires external:lmtool
 * @requires Bytes
 * @requires external:node_helper
 */
module.exports = NodeHelper.create({

    /** @member {boolean} listening - Flag to indicate listen state. */
    listening: false,

    /** @member {(boolean|string)} mode - Contains active module mode. */
    mode: false,

    /** @member {boolean} hdmi - Flag to indicate hdmi output state. */
    hdmi: true,

    /** @member {boolean} help - Flag to toggle help modal. */
    help: false,

    /** @member {string[]} words - List of all words that are registered by the modules. */
    words: [],

    /**
     * @function start
     * @description Logs a start message to the console.
     * @override
     */
    start() {
        console.log(`Starting module helper: ${this.name}`);
    },

    /**
     * @function socketNotificationReceived
     * @description Receives socket notifications from the module.
     * @override
     *
     * @param {string} notification - Notification name
     * @param {*} payload - Detailed payload of the notification.
     */
    socketNotificationReceived(notification, payload) {
        if (notification === 'START') {
            /** @member {Object} config - Module config. */
            this.config = payload.config;
            /** @member {number} time - Time to listen after keyword. */
            this.time = this.config.timeout * 1000;
            /** @member {Object} modules - List of modules with their modes and commands. */
            this.modules = payload.modules;

            this.fillWords();
            this.checkFiles();
        }
    },

    /**
     * @function fillwords
     * @description Sets {@link node_helper.words} with all needed words for the registered
     * commands by the modules. This list has unique items and is sorted by alphabet.
     */
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

    /**
     * @function checkFiles
     * @description Checks if words.json exists or has different entries as this.word.
     */
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

    /**
     * @function arraysEqual
     * @description Compares two arrays.
     *
     * @param {string[]} a - First array
     * @param {string[]} b - Second array
     * @returns {boolean} Are the arrays equal or not.
     */
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

    /**
     * @function generateDicLM
     * @description Generates new Dictionairy and Language Model.
     */
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

                fs.unlink(`${filename}.log_pronounce`, this.noOp);
                fs.unlink(`${filename}.sent`, this.noOp);
                fs.unlink(`${filename}.vocab`, this.noOp);
                fs.unlink(`TAR${filename}.tgz`, this.noOp);
            }
        });
    },

    /**
     * @function noOp
     * @description Performs no operation.
     */
    noOp() {},

    /**
     * @function startPocketsphinx
     * @description Starts Pocketsphinx binary.
     */
    startPocketsphinx() {
        console.log(`${this.name}: Starting pocketsphinx.`);

        this.ps = new Psc({
            setId: this.name,
            verbose: true,
            microphone: this.config.microphone
        });

        this.ps.on('data', this.handleData.bind(this));

        if (this.config.debug) {
            this.ps.on('debug', this.logDebug.bind(this));
        }

        this.ps.on('error', this.logError.bind(this));

        this.sendSocketNotification('READY');
    },

    /**
     * @function handleData
     * @description Helper method to handle recognized data.
     *
     * @param {string} data - Recognized data
     */
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

    /**
     * @function logDebug
     * @description Logs debug information into debug log file.
     *
     * @param {string} data - Debug information
     */
    logDebug(data) {
        fs.appendFile('modules/MMM-voice/debug.log', data, (err) => {
            if (err) {
                console.log(`${this.name}: Couldn't save error to log file!`);
            }
        });
    },

    /**
     * @function logError
     * @description Logs error information into error log file.
     *
     * @param {string} data - Error information
     */
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

    /**
     * @function cleanData
     * @description Removes prefix/keyword and multiple spaces.
     *
     * @param {string} data - Recognized data to clean.
     * @returns {string} Cleaned data
     */
    cleanData(data) {
        let temp = data;
        const i = temp.indexOf(this.config.keyword);
        if (i !== -1) {
            temp = temp.substr(i + this.config.keyword.length);
        }
        temp = temp.replace(/ {2,}/g, ' ').trim();
        return temp;
    },

    /**
     * @function checkCommands
     * @description Checks for commands of voice module
     * @param {string} data - Recognized data
     */
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
