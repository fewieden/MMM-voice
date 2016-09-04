/* Magic Mirror
 * Module: MMM-voice
 *
 * By fewieden https://github.com/fewieden/MMM-voice
 * MIT Licensed.
 */

const Psc = require('pocketsphinx-continuous');
const fs = require('fs');
const exec = require('child_process').exec;
const compare = require('file-compare').compare;
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    listening: false,
    mode: false,
    hdmi: true,
    help: false,

    socketNotificationReceived: function(notification, payload){
        if(notification === 'START'){
            this.config = payload.config;
            this.modules = payload.modules;

            this.createFiles();
        }
    },

    createFiles: function(){
        console.log('MMM-voice: creating files');
        var words = this.config.keyword.split(' ').join('\n') + '\n';
        var sentences = '<s> ' + this.config.keyword + ' </s>\n';
        for(var i = 0; i < this.modules.length; i++){
            words += this.modules[i].mode + '\n';
            sentences += '<s> ' + this.modules[i].mode + ' </s>\n';
            for(var n = 0; n < this.modules[i].sentences.length; n++){
                words += this.modules[i].sentences[n].split(' ').join('\n') + '\n';
                sentences += '<s> ' + this.modules[i].sentences[n] + ' </s>\n';
            }
        }
        fs.writeFile('modules/MMM-voice/words_temp.txt', words);
        fs.writeFile('modules/MMM-voice/sentences_temp.txt', sentences);
        exec('sort -u -o modules/MMM-voice/words_temp.txt modules/MMM-voice/words_temp.txt ' +
            '&& sort -u -o modules/MMM-voice/sentences_temp.txt modules/MMM-voice/sentences_temp.txt',
            (error, stdout, stderr) => {
                if(error){
                    this.sendSocketNotification('ERROR', "Couldn't create necessary files!");
                } else {
                    this.checkFiles();
                }
            }
        );
    },

    checkFiles: function(){
        console.log('MMM-voice: checking files');
        compare('modules/MMM-voice/words.txt', 'modules/MMM-voice/words_temp.txt', (result, error) => {
            if(result){
                compare('modules/MMM-voice/sentences.txt', 'modules/MMM-voice/sentences_temp.txt', (result, error) => {
                    if(result){
                        this.startPocketsphinx();
                    } else {
                        this.generateDicLM();
                    }
                });
            } else {
                this.generateDicLM();
            }
        });
    },

    generateDicLM: function(){
        console.log('MMM-voice: generating .dic and .lm');
        exec('mv modules/MMM-voice/words_temp.txt modules/MMM-voice/words.txt && mv modules/MMM-voice/sentences_temp.txt modules/MMM-voice/sentences.txt',
            (error, stdout, stderr) => {
            if(!error){
                exec('g2p-seq2seq --decode modules/MMM-voice/words.txt --model modules/MMM-voice/model | tail -n +3 > modules/MMM-voice/MMM-voice.dic ' +
                    '&& text2wfreq < modules/MMM-voice/sentences.txt | wfreq2vocab > modules/MMM-voice/MMM-voice.vocab ' +
                    '&& text2idngram -vocab modules/MMM-voice/MMM-voice.vocab -idngram modules/MMM-voice/MMM-voice.idngram < modules/MMM-voice/sentences.txt ' +
                    '&& idngram2lm -vocab_type 0 -idngram modules/MMM-voice/MMM-voice.idngram -vocab modules/MMM-voice/MMM-voice.vocab -arpa modules/MMM-voice/MMM-voice.lm',
                    (error, stdout, stderr) => {
                        if(!error){
                            this.startPocketsphinx();
                        } else {
                            this.sendSocketNotification('ERROR', "Couldn't create necessary files!");
                        }
                    }
                );
            } else {
                this.sendSocketNotification('ERROR', "Couldn't create necessary files!");
            }
        });
    },

    startPocketsphinx: function(){
        console.log('MMM-voice: starting pocketsphinx');
        this.time = this.config.timeout * 1000;
        this.ps = new Psc({
            setId: 'MMM-voice',
            verbose: true,
            microphone: this.config.microphone
        });

        this.ps.on('data', (data) => {
            if(typeof data === 'string'){
                if(this.config.debug){
                    console.log(data);
                    this.sendSocketNotification('DEBUG', data);
                }
                if(data.indexOf(this.config.keyword) !== -1 || this.listening){
                    this.listening = true;
                    this.sendSocketNotification('LISTENING');
                    if(this.timer){
                        clearTimeout(this.timer);
                    }
                    this.timer = setTimeout(() => {
                        this.listening = false;
                        this.sendSocketNotification('SLEEPING');
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
                    if(this.mode === 'voice'){
                        this.checkCommands(data);
                    }
                    this.sendSocketNotification('VOICE', {mode: this.mode, sentence: data});
                }
            }
        });

        if(this.config.debug){
            this.ps.on('debug', (data) => {
                fs.appendFile('modules/MMM-voice/debug.log', data);
            });
        }

        this.ps.on('error', (error) => {
            if(error){
                fs.appendFile('modules/MMM-voice/error.log', error);
                this.sendSocketNotification('ERROR', error);
            }
        });

        this.sendSocketNotification("READY");
    },

    cleanData: function(data){
        var i = data.indexOf(this.config.keyword);
        if (i !== -1) {
            data = data.substr(i + this.config.keyword.length);
        }
        data = data.replace(/  +/g, ' ').trim();
        return data;
    },

    checkCommands: function(data){
        if(/(turn)/g.test(data)){
            if(/(on)/g.test(data) || !this.hdmi && !/(off)/g.test(data)){
                exec("/opt/vc/bin/tvservice -p && sudo chvt 6 && sudo chvt 7", null);
                this.hdmi = true;
            } else if(/(off)/g.test(data) || this.hdmi && !/(on)/g.test(data)){
                exec("/opt/vc/bin/tvservice -o", null);
                this.hdmi = false;
            }
        } else if(/(hide)/g.test(data)){
            this.sendSocketNotification("HIDE");
        } else if(/(show)/g.test(data)){
            this.sendSocketNotification("SHOW");
        } else if(/(help)/g.test(data)){
            if(/(open)/g.test(data) || !this.help && !/(close)/g.test(data)){
                this.sendSocketNotification("RENDER_HELP");
                this.help = true;
            } else if(/(close)/g.test(data) || this.help && !/(open)/g.test(data)){
                this.sendSocketNotification("REMOVE_HELP");
                this.help = false;
            }
        }
    }
});