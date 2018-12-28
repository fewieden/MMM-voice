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
    /** @member {string[]} previouslyHidden - keep list of module identifiers already hidden when sleep occurs */
    previouslyHidden: [],
    /**
     * @member {Object} defaults - Defines the default config values.
     * @property {int} timeout - Seconds to active listen for commands.
     * @property {string} keyword - Keyword to activate active listening.
     * @property {boolean} debug - Flag to enable debug information.
     * @property {string} standByMethod - Method which should be used to put the monitor in stand by.
     */
    defaults: {
        timeout: 15,
        keyword: 'MAGIC MIRROR',
        debug: false,
        standByMethod: 'TVSERVICE',
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
     * @function getTemplate
     * @description Nunjuck template.
     * @override
     *
     * @returns {string} Path to nunjuck template.
     */
    getTemplate() {
        return 'templates/MMM-voice.njk';
    },

    /**
     * @function getTemplateData
     * @description Data that gets rendered in the nunjuck template.
     * @override
     *
     * @returns {Object} Data for the nunjuck template.
     */
    getTemplateData() {
        return {
            config: this.config,
            icon: this.icon,
            pulsing: this.pulsing,
            mode: this.mode,
            debugInformation: this.debugInformation
        };
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
        } else if (notification === 'HIDE') {
            MM.getModules().enumerate((module) => {
                module.hide(1000);
            });
            this.sendNotification('STAND_BY', { status: true, modules: [] });
        } else if (notification === 'SHOW') {
            MM.getModules().enumerate((module) => {
                module.show(1000);
            });
            this.sendNotification('STAND_BY', { status: false });
        } else if (notification === 'STAND_BY_ACTION') {
            if (payload.action === 'show') {
                if (payload.hardware === false) {
                    MM.getModules().enumerate((module) => {
                        if (this.previouslyHidden.includes(module.identifier)) {
                            module.show(1000);
                        }
                    });
                    this.previouslyHidden = [];
                }

                this.sendNotification('STAND_BY', { status: false });
            } else if (payload.action === 'hide') {
                if (payload.hardware === false) {
                    MM.getModules().enumerate((module) => {
                        if (module.hidden === true) {
                            this.previouslyHidden.push(module.identifier);
                        } else {
                            module.hide(1000);
                        }
                    });
                }

                this.sendNotification('STAND_BY', { status: true, modules: this.previouslyHidden.slice(0) });
            }
        } else if (notification === 'DEBUG') {
            this.debugInformation = payload;
        }
        this.updateDom(300);
    }
});
