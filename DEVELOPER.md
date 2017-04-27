# MMM-voice Development Documentation

This document describes the way to support your own MagicMirror² module with voice control.

## Mode

Use an unique mode, which is not already taken from one of the other modules in this [list](https://github.com/fewieden/MMM-voice/wiki/Supported-Modules).

## COMMANDS

Try to avoid short words like `ON`, `TO`, etc. as far as possible

## Register your commands

As soon as you receive the notification `ALL_MODULES_STARTED` from the core system, register your voice commands by sending the following notification

* notification: `REGISTER_VOICE_MODULE`
* payload: Object with `mode` (string) and `sentence` (array) properties

### Example commands registration

```javascript
notificationReceived: function (notification, payload, sender) {
    if(notification === "ALL_MODULES_STARTED"){
        this.sendNotification("REGISTER_VOICE_MODULE", {
            mode: "FOOTBALL",
            sentences: [
                "OPEN HELP",
                "CLOSE HELP",
                "SHOW STATISTIC",
                "HIDE STATISTIC"
            ]
        });
    }
}
```

## Handle recognized data

When the user is in the mode of your module, you will receive the following notification

* notification: `VOICE_YOURMODE`
* payload: String with all detected words.

### Example commands recognition

```javascript
notificationReceived: function (notification, payload, sender) {
    ...
    if(notification === "VOICE_FOOTBALL" && sender.name === "MMM-voice"){
        this.checkCommands(payload);
    }
}

// test for your commands
checkCommands: function(data){
    if(/(OPEN)/g.test(data) && /(HELP)/g.test(data)){
        // do your magic
    }
    ...
}
```

## React on mode change

When the mode of MMM-voice gets changed it will send a broadcast `VOICE_MODE_CHANGED`

* notification: `VOICE_MODE_CHANGED`
* payload: Object with `old` (string) and `new` (string) mode as properties

This gets handy e.g. to revert your manipulations on the DOM.

### Example mode change

```javascript
notificationReceived: function (notification, payload, sender) {
    ...
    if(notification === "VOICE_MODE_CHANGED" && sender.name === "MMM-voice" && payload.old === "FOOTBALL"){
        // do your magic
    }
}
```
