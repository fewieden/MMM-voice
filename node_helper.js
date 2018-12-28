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
 * @external fs-extra
 * @see https://www.npmjs.com/package/fs-extra
 */
const fs = require('fs-extra');

/**
 * @external lodash
 * @see https://www.npmjs.com/package/lodash
 */
const _ = require('lodash');

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
 * @requires external:node_helper
 */
module.exports = NodeHelper.create({

    /** @member {boolean} listening - Flag to indicate listen state. */
    listening: false,

    /** @member {boolean|string} mode - Contains active module mode. */
    mode: false,

    /** @member {boolean} help - Flag to toggle help modal. */
    help: false,

    /** @member {string[]} words - List of all words that are registered by the modules. */
    words: [],

    /** @member {Object} standBy - Mapping of stand by methods with commands. */
    standBy: {
        TVSERVICE: {
            hardware: true,
            show: '/opt/vc/bin/tvservice -p && sudo chvt 6 && sudo chvt 7',
            hide: '/opt/vc/bin/tvservice -o'
        },
        DPMS: {
            hardware: true,
            show: 'xset dpms force on',
            hide: 'xset dpms force off'
        },
        VCGENCMD: {
            hardware: true,
            show: 'vcgencmd display_power 1',
            hide: 'vcgencmd display_power 0'
        },
        HIDE: {
            hardware: false
        }
    },

    /**
     * @function socketNotificationReceived
     * @description Receives socket notifications from the module.
     * @async
     * @override
     *
     * @param {string} notification - Notification name
     * @param {*} payload - Detailed payload of the notification.
     */
    async socketNotificationReceived(notification, payload) {
        if (notification === 'START') {
            /** @member {Object} config - Module config. */
            this.config = payload.config;
            /** @member {number} time - Time to listen after keyword. */
            this.time = this.config.timeout * 1000;
            /** @member {Object} modules - List of modules with their modes and commands. */
            this.modules = payload.modules;

            this.fillWords();
            await this.checkFiles();
        }
    },

    /**
     * @function fillwords
     * @description Sets {@link node_helper.words} with all needed words for the registered
     * commands by the modules. This list has unique items and is sorted by alphabet.
     */
    fillWords() {
        let allWords = _.split(this.config.keyword, ' ');

        for (const module of this.modules) {
            const mode = _.split(module.mode, ' ');
            allWords = _.concat(allWords, mode);
            for (const sentence of module.sentences) {
                const words = _.split(sentence, ' ');
                allWords = _.concat(allWords, words);
            }
        }

        this.words = _.sortBy(_.uniq(allWords));
    },

    /**
     * @function checkFiles
     * @description Checks if words.json exists or has different entries as this.word.
     * @async
     */
    async checkFiles() {
        console.log(`${this.name}: Checking files.`);
        const file = 'modules/MMM-voice/words.json';
        const exists = await fs.pathExists(file);

        if (exists) {
            const words = await fs.readJson(file);
            if (_.isEqual(this.words, words)) {
                return this.startPocketsphinx();
            }
        }

        this.generateDicLM();
    },

    /**
     * @function generateDicLM
     * @description Generates new Dictionairy and Language Model.
     * @async
     */
    async generateDicLM() {
        console.log(`${this.name}: Generating dictionairy and language model.`);

        await fs.writeJson('modules/MMM-voice/words.json', this.words);

        lmtool(this.words, async (err, filename) => {
            if (err) {
                this.sendSocketNotification('ERROR', 'Couldn\'t create necessary files!');
            } else {
                await fs.move(`${filename}.dic`, 'modules/MMM-voice/MMM-voice.dic', {overwrite: true});
                await fs.move(`${filename}.lm`, 'modules/MMM-voice/MMM-voice.lm', {overwrite: true});

                this.startPocketsphinx();

                await fs.remove(`${filename}.log_pronounce`);
                await fs.remove(`${filename}.sent`);
                await fs.remove(`${filename}.vocab`);
                await fs.remove(`TAR${filename}.tgz`);
            }
        });
    },

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

            if (_.includes(data, this.config.keyword) || this.listening) {
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

            for (const module of this.modules) {
                const i = _.indexOf(cleanData, module.mode);
                if (i === 0) {
                    this.mode = module.mode;
                    cleanData = _.trim(cleanData.substr(i + module.mode.length));
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
     * @async
     *
     * @param {string} data - Debug information
     */
    async logDebug(data) {
        try {
            await fs.appendFile('modules/MMM-voice/debug.log', `${data}\n`);
        } catch(e) {
            console.log(`${this.name}: Couldn't save debug information to log file!`, e);
        }
    },

    /**
     * @function logError
     * @description Logs error information into error log file.
     * @async
     *
     * @param {string} error - Error information
     */
    async logError(error) {
        if (error) {
            try {
                await fs.appendFile('modules/MMM-voice/error.log', `${error}\n`);
            } catch(e) {
                console.log(`${this.name}: Couldn't save error to log file!`, e);
            }

            this.sendSocketNotification('ERROR', error);
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
        const i = _.indexOf(data, this.config.keyword);

        if (i !== -1) {
            data = data.substr(i + this.config.keyword.length);
        }

        return _.trim(_.replace(data, / {2,}/g, ' '));
    },

    /**
     * @function handleStandBy
     * @description Handles stand by with various methods.
     *
     * @param {string} method - Stand by method to use.
     * @param {string} action - Action to perform.
     */
    handleStandBy(method, action) {
        if (this.standBy.hasOwnProperty(method)) {
            if (this.standBy[method].hardware) {
                exec(this.standBy[method][action], null);
            }

            this.sendSocketNotification('STAND_BY_ACTION', {
                type: action,
                hardware: this.standBy[method].hardware
            });
        }
    },

    /**
     * @function checkCommands
     * @description Checks for commands of voice module
     * @param {string} data - Recognized data
     */
    checkCommands(data) {
        if (/(WAKE)/g.test(data) && /(UP)/g.test(data)) {
            this.handleStandBy(this.config.standByMethod.toUpperCase(), 'show');
        } else if (/(GO)/g.test(data) && /(SLEEP)/g.test(data)) {
            this.handleStandBy(this.config.standByMethod.toUpperCase(), 'hide');
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
