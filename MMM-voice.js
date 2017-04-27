/**
 * @file MMM-voice.js
 *
 * @author fewieden
 * @license MIT
 *
 * @see  https://github.com/fewieden/MMM-voice
 */

/* global Module Log MM */

/**
 * @external Module
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/module.js
 */

/**
 * @external Log
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/logger.js
 */

/**
 * @external MM
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/main.js
 */

/**
 * @module MMM-voice
 * @description Frontend for the module to display data.
 *
 * @requires external:Module
 * @requires external:Log
 * @requires external:MM
 */
Module.register('MMM-voice', {

    /** @member {string} icon - Microphone icon. */
    icon: 'fa-microphone-slash',
    /** @member {boolean} pulsing - Flag to indicate listening state. */
    pulsing: true,
    /** @member {boolean} help - Flag to switch between render help or not. */
    help: false,

    /**
     * @member {Object} voice - Defines the default mode and commands of this module.
     * @property {string} mode - Voice mode of this module.
     * @property {string[]} sentences - List of voice commands of this module.
     */
    voice: {
        mode: 'VOICE',
        sentences: [
            'HIDE MODULES',
            'SHOW MODULES',
            'WAKE UP',
            'GO TO SLEEP',
            'OPEN HELP',
            'CLOSE HELP'
        ]
    },

    /** @member {Object[]} modules - Set of all modules with mode and commands. */
    modules: [],

    /**
     * @member {Object} defaults - Defines the default config values.
     * @property {int} timeout - Seconds to active listen for commands.
     * @property {string} keyword - Keyword to activate active listening.
     * @property {boolean} debug - Flag to enable debug information.
     */
    defaults: {
        timeout: 15,
        keyword: 'MAGIC MIRROR',
        debug: false
    },

    /**
     * @function start
     * @description Sets mode to initialising.
     * @override
     */
    start() {
        Log.info(`Starting module: ${this.name}`);
        this.mode = this.translate('INIT');
        this.modules.push(this.voice);
        Log.info(`${this.name} is waiting for voice command registrations.`);
    },

    /**
     * @function getStyles
     * @description Style dependencies for this module.
     * @override
     *
     * @returns {string[]} List of the style dependency filepaths.
     */
    getStyles() {
        return ['font-awesome.css', 'MMM-voice.css'];
    },

    /**
     * @function getTranslations
     * @description Translations for this module.
     * @override
     *
     * @returns {Object.<string, string>} Available translations for this module (key: language code, value: filepath).
     */
    getTranslations() {
        return {
            en: 'translations/en.json',
            de: 'translations/de.json',
            id: 'translations/id.json'
        };
    },

    /**
     * @function getDom
     * @description Creates the UI as DOM for displaying in MagicMirror application.
     * @override
     *
     * @returns {Element}
     */
    getDom() {
        const wrapper = document.createElement('div');
        const voice = document.createElement('div');
        voice.classList.add('small', 'align-left');

        const icon = document.createElement('i');
        icon.classList.add('fa', this.icon, 'icon');
        if (this.pulsing) {
            icon.classList.add('pulse');
        }
        voice.appendChild(icon);

        const modeSpan = document.createElement('span');
        modeSpan.innerHTML = this.mode;
        voice.appendChild(modeSpan);
        if (this.config.debug) {
            const debug = document.createElement('div');
            debug.innerHTML = this.debugInformation;
            voice.appendChild(debug);
        }

        const modules = document.querySelectorAll('.module');
        for (let i = 0; i < modules.length; i += 1) {
            if (!modules[i].classList.contains(this.name)) {
                if (this.help) {
                    modules[i].classList.add(`${this.name}-blur`);
                } else {
                    modules[i].classList.remove(`${this.name}-blur`);
                }
            }
        }

        if (this.help) {
            voice.classList.add(`${this.name}-blur`);
            const modal = document.createElement('div');
            modal.classList.add('modal');
            this.appendHelp(modal);
            wrapper.appendChild(modal);
        }

        wrapper.appendChild(voice);

        return wrapper;
    },

    /**
     * @function notificationReceived
     * @description Handles incoming broadcasts from other modules or the MagicMirror core.
     * @override
     *
     * @param {string} notification - Notification name
     * @param {*} payload - Detailed payload of the notification.
     */
    notificationReceived(notification, payload) {
        if (notification === 'DOM_OBJECTS_CREATED') {
            this.sendSocketNotification('START', { config: this.config, modules: this.modules });
        } else if (notification === 'REGISTER_VOICE_MODULE') {
            if (Object.prototype.hasOwnProperty.call(payload, 'mode') && Object.prototype.hasOwnProperty.call(payload, 'sentences')) {
                this.modules.push(payload);
            }
        }
    },

    /**
     * @function socketNotificationReceived
     * @description Handles incoming messages from node_helper.
     * @override
     *
     * @param {string} notification - Notification name
     * @param {*} payload - Detailed payload of the notification.
     */
    socketNotificationReceived(notification, payload) {
        if (notification === 'READY') {
            this.icon = 'fa-microphone';
            this.mode = this.translate('NO_MODE');
            this.pulsing = false;
        } else if (notification === 'LISTENING') {
            this.pulsing = true;
        } else if (notification === 'SLEEPING') {
            this.pulsing = false;
        } else if (notification === 'ERROR') {
            this.mode = notification;
        } else if (notification === 'VOICE') {
            for (let i = 0; i < this.modules.length; i += 1) {
                if (payload.mode === this.modules[i].mode) {
                    if (this.mode !== payload.mode) {
                        this.help = false;
                        this.sendNotification(`${notification}_MODE_CHANGED`, { old: this.mode, new: payload.mode });
                        this.mode = payload.mode;
                    }
                    if (this.mode !== 'VOICE') {
                        this.sendNotification(`${notification}_${payload.mode}`, payload.sentence);
                    }
                    break;
                }
            }
        } else if (notification === 'BYTES') {
            this.sendNotification('MMM-TTS', payload);
        } else if (notification === 'HIDE') {
            MM.getModules().enumerate((module) => {
                module.hide(1000);
            });
        } else if (notification === 'SHOW') {
            MM.getModules().enumerate((module) => {
                module.show(1000);
            });
        } else if (notification === 'OPEN_HELP') {
            this.help = true;
        } else if (notification === 'CLOSE_HELP') {
            this.help = false;
        } else if (notification === 'DEBUG') {
            this.debugInformation = payload;
        }
        this.updateDom(300);
    },

    /**
     * @function appendHelp
     * @description Creates the UI for the voice command SHOW HELP.
     *
     * @param {Element} appendTo - DOM Element where the UI gets appended as child.
     */
    appendHelp(appendTo) {
        const title = document.createElement('h1');
        title.classList.add('medium');
        title.innerHTML = `${this.name} - ${this.translate('COMMAND_LIST')}`;
        appendTo.appendChild(title);

        const mode = document.createElement('div');
        mode.innerHTML = `${this.translate('MODE')}: ${this.voice.mode}`;
        appendTo.appendChild(mode);

        const listLabel = document.createElement('div');
        listLabel.innerHTML = `${this.translate('VOICE_COMMANDS')}:`;
        appendTo.appendChild(listLabel);

        const list = document.createElement('ul');
        for (let i = 0; i < this.voice.sentences.length; i += 1) {
            const item = document.createElement('li');
            item.innerHTML = this.voice.sentences[i];
            list.appendChild(item);
        }
        appendTo.appendChild(list);
    }
});
