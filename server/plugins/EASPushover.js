var push = require('pushover-notifications');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    var pConf = data.pluginconf.EASPushover;
    if (pConf && pConf.enable) {
        logger.main.info("TESTING PUSH");
        //ensure key has been entered before trying to push
        if (pConf.group == 0 || pConf.group == '0' || !pConf.group) {
            logger.main.error('Pushover: ' + data.address + ' No User/Group key set. Please enter User/Group Key.');
            callback();
        } else {
            if (data.EAS_type == 0 && pConf.eeanble)
            {
                var p = new push({
                    user: pConf.group,
                    token: config.pushAPIKEY,
                });

                var pushSound;
                if (pConf.esound) {
                    pushSound = pConf.esound.value;
                }

                var pushPri = 0; // default
                if (pConf.epriority) {
                    pushPri = pConf.epriority.value;
                }

                var msg = {
                    message: data.message,
                    title: data.agency+' - '+data.alias,
                    sound: pushSound,
                    priority: pushPri,
                    onerror: function(err) {
                        logger.main.error('Pushover:', err);
                    }
                };

                if (pushPri == 2 || pushPri == '2') {
                    //emergency message
                    msg.retry = 60;
                    msg.expire = 240;
                    logger.main.info("SENDING EMERGENCY PUSH NOTIFICATION")
                }

                p.send(msg, function (err, result) {
                    if (err) { logger.main.error('Pushover:' + err); }
                    logger.main.debug('Pushover:' + result);
                    callback();
                });
            }
            else if (data.EAS_type == 1 && pConf.neanble)
            {
                var p = new push({
                    user: pConf.group,
                    token: config.pushAPIKEY,
                });

                var pushSound;
                if (pConf.nsound) {
                    pushSound = pConf.nsound.value;
                }

                var pushPri = 0; // default
                if (pConf.npriority) {
                    pushPri = pConf.npriority.value;
                }

                var msg = {
                    message: data.message,
                    title: data.agency+' - '+data.alias,
                    sound: pushSound,
                    priority: pushPri,
                    onerror: function(err) {
                        logger.main.error('Pushover:', err);
                    }
                };

                if (pushPri == 2 || pushPri == '2') {
                    //emergency message
                    msg.retry = 60;
                    msg.expire = 240;
                    logger.main.info("SENDING EMERGENCY PUSH NOTIFICATION")
                }

                p.send(msg, function (err, result) {
                    if (err) { logger.main.error('Pushover:' + err); }
                    logger.main.debug('Pushover:' + result);
                    callback();
                });
            }
            else if (data.EAS_type == 2)
            {
                p = new push({
                    user: pConf.group,
                    token: config.pushAPIKEY,
                });

                var pushSound;
                if (pConf.asound) {
                    pushSound = pConf.asound.value;
                }

                var pushPri = 0; // default
                if (pConf.apriority) {
                    pushPri = pConf.apriority.value;
                }

                var msg = {
                    message: data.message,
                    title: data.agency+' - '+data.alias,
                    sound: pushSound,
                    priority: pushPri,
                    onerror: function(err) {
                        logger.main.error('Pushover:', err);
                    }
                };

                if (pushPri == 2 || pushPri == '2') {
                    //emergency message
                    msg.retry = 60;
                    msg.expire = 240;
                    logger.main.info("SENDING EMERGENCY PUSH NOTIFICATION")
                }

                p.send(msg, function (err, result) {
                    if (err) { logger.main.error('Pushover:' + err); }
                    logger.main.debug('Pushover:' + result);
                    callback();
                });
            }
            else {
                logger.main.info("EASPUSH NOTHING!!!")
                callback();
            }
        }
    } else {
        callback();
    }

}

module.exports = {
    run: run
}