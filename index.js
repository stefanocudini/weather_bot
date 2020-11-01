
const _ = require('lodash');
const moment = require('moment');

//TODO move into config
moment.locale('it');

const telegraf = require('telegraf');
const telegram = require('telegraf/telegram');
const telegrafLogger = require('telegraf-update-logger'); 

const config = require('./config');
const wu = require('./weather_underground');
const html2image = require('./html2image');

const meteotrentino = require('./meteotrentino');

const bot = new telegraf(config.bot_token);

bot.use(telegrafLogger({
	colors: true,
	log: (str) => console.log(new Date().toISOString(), str)
}));

bot.start( ctx => {
	console.log('Bot start...');
	ctx.reply(config.i18n.list);
});

bot.command(['list','stazioni'], ctx => {
	ctx.reply(wu.list()+"\n\n"+config.i18n.list);
});

//TODO move radr into meteotrentino
bot.command('radar', ctx => {
	ctx.replyWithAnimation({ url: config.radar.url }).then(()=>{
		ctx.reply(config.i18n.list);
	});
});

bot.command('meteo', ctx => {
	meteotrentino.nextDays((bufs) => {
		let medias = _.map(bufs, (buf, k)=> {
			console.log('medias',k)
			return {
				media: { source: buf },
				type: 'photo',
				caption: moment().day(k).format('dddd')
			};
		});

		ctx.replyWithMediaGroup(medias).then(()=>{
			ctx.reply(config.i18n.list);
		});
	})
});

for(let name in config.stations) {
	
	bot.command(name, ctx => {

		wu.conditions(name, data => {

			console.log('wu conditions', name, data.date);

			let station = config.stations[name];

			data.botInfo = ctx.botInfo;
			data.station = name;

			html2image.dataToImage(data, buf => {

				let medias = [{
					media: { source: buf },
					type: 'photo',
					caption: config.i18n.list//wu.simpleFormat(data)
				}];
				// https://github.com/telegraf/telegraf/blob/develop/docs/examples/media-bot.js
				if(station.webcam) {
					medias.push({
						//source: res.buffer(),
						media: { url: station.webcam },
						type: 'photo'
					});
				}

				ctx.replyWithMediaGroup(medias);
			});
		});

	});
}

/*bot.command('meteo', ctx => {
	let msg = context.update.message
	let param = msg.text.split(' ')[1];
	console.log('command /meteo', param);
});*/

bot.on('message', ctx => {
	console.log('onMessage',ctx.message.from.username)
	ctx.reply(config.i18n.list);
});

bot.launch();
