## Warning this is still work in progress

# MMM-voice
Voice Recognition Module for MagicMirror<sup>2</sup>

## Dependencies
  * An installation of [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror)
  * [SphinxBase](http://cmusphinx.sourceforge.net/)
  * [pocketsphinx](https://github.com/cmusphinx/pocketsphinx)
  * The pocketsphinx_continuous binary on your path.
  * A microphone
  * npm
  * [pocketsphinx-continuous](https://www.npmjs.com/package/pocketsphinx-continuous)

## Installation
 1. Clone this repo into `~/MagicMirror/modules` directory.
 2. Configure your `~/MagicMirror/config/config.js`:

    ```
    {
        module: 'MMM-voice',
        position: 'bottom_bar',
        config: {
            id: 4548
            ...
        }
    }
    ```
 3. Run command `npm install` in `~/MagicMirror/modules/MMM-voice` directory.
 4. Edit `~/MagicMirror/modules/MMM-voice/node_modules/pocketsphinx-continuous/index.js` to:

    ```
    function PocketSphinxContinuous(config) {
      ...

      var pc = spawn('pocketsphinx_continuous', [
        '-adcdev',
        'plughw:0',
        '-inmic',
        'yes',
        '-lm',
        'modules/MMM-voice/' + this.setId + '.lm',
        '-dict',
        'modules/MMM-voice/' + this.setId + '.dic'
      ]);
      ...
    ```

## Config Options
| **Option** | **Default** | **Description** |
| --- | --- | --- |
| `timeout` | 15 | time the keyword should be active without saying something |
| `id` | REQUIRED | id of dictionairy file |

## Custom Dictionairy
Go to [Sphinx Knowledge Base Tool](http://www.speech.cs.cmu.edu/tools/lmtool-new.html) and create your own
