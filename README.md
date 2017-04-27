# MMM-voice  [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://raw.githubusercontent.com/fewieden/MMM-voice/master/LICENSE) [![Build Status](https://travis-ci.org/fewieden/MMM-voice.svg?branch=master)](https://travis-ci.org/fewieden/MMM-voice) [![Code Climate](https://codeclimate.com/github/fewieden/MMM-voice/badges/gpa.svg?style=flat)](https://codeclimate.com/github/fewieden/MMM-voice) [![Known Vulnerabilities](https://snyk.io/test/github/fewieden/mmm-voice/badge.svg)](https://snyk.io/test/github/fewieden/mmm-voice) [![API Doc](https://doclets.io/fewieden/MMM-voice/master.svg)](https://doclets.io/fewieden/MMM-voice/master)

Voice Recognition Module for MagicMirror<sup>2</sup>

## Information

This voice recognition works offline. To protect your privacy, no one will record what's going on in your room all day long.
So keep in mind that there is no huge server farm, that handles your voice commands. The raspberry is just a small device and this is a cpu intensive task.
Also the dictionairy has only the words specified by the modules, so there is a chance for false positives.

If you can live with latency, bugged detections and want to have data privacy, feel free to use this module.

## Dependencies

* An installation of [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror)
* Packages: bison libasound2-dev autoconf automake libtool python-dev swig python-pip
* [SphinxBase](https://github.com/cmusphinx/sphinxbase)
* [PocketSphinx](https://github.com/cmusphinx/pocketsphinx)
* A microphone
* npm
* [PocketSphinx-continuous](https://www.npmjs.com/package/pocketsphinx-continuous)
* [lmtool](https://www.npmjs.com/package/lmtool)

## Installation

1. Clone this repo into `~/MagicMirror/modules` directory.
1. Run command `bash dependencies.sh` in `~/MagicMirror/modules/MMM-voice/installers` directory, to install all dependencies. This will need a couple of minutes.
1. Configure your `~/MagicMirror/config/config.js`:

    ```
    {
        module: 'MMM-voice',
        position: 'bottom_bar',
        config: {
            microphone: 1,
            ...
        }
    }
    ```

## Config Options

| **Option** | **Default** | **Description** |
| --- | --- | --- |
| `microphone` | REQUIRED | Id of microphone shown in the installer. |
| `keyword` | `'MAGIC MIRROR'` | Keyword the mirror starts to listen. IMPORTANT: Only UPPERCASE Letters |
| `timeout` | `15` | time the keyword should be active without saying something |

## Usage

You need to say your KEYWORD (Default: MAGIC MIRROR), when the KEYWORD is recognized the microphone will start to flash and as long as the microphone is flashing (timeout config option) the mirror will recognize COMMANDS or MODES (Keep in mind that the recognition will take a while, so when you say your COMMAND right before the microphone stops flashing the COMMAND will propably not recognized).

Mode of this module: `VOICE`

COMMANDS:

* HIDE MODULES
* SHOW MODULES
* WAKE UP
* GO TO SLEEP
* OPEN HELP
* CLOSE HELP

### Select Mode

To select a MODE, the specfic MODE has to be the first word of a COMMAND or right after the KEYWORD, when the microphone stopped flashing.

## Supported modules

List of all supported modules in the [Wiki](https://github.com/fewieden/MMM-voice/wiki/Supported-Modules).

## Developer

* `npm run lint` - Lints JS and CSS files.
* `npm run docs` - Generates documentation.

### Documentation

The documentation can be found [here](https://doclets.io/fewieden/MMM-voice/master)

### Developers Guide

If you want to support your own module, check out the [Guide](DEVELOPER.md) and add it to the [Wiki](https://github.com/fewieden/MMM-voice/wiki/Supported-Modules).
