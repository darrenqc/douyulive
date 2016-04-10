'use strict'

const fs = require('fs'),
util = require('util'),
moment = require('moment'),
logger = require('winston');

logger.cli();

function Spider() {
    this.name = 'douyulive';
}

Spider.prototype = {
    onInit:function(done) {
		this.resultDir = './result/';
		this.resultFile = util.format('douyulive.%s.csv', moment().format('YYYY-MM-DD'));
		if(!fs.existsSync(this.resultDir)){
		    fs.mkdirSync(this.resultDir);
		}
		fs.writeFileSync(this.resultDir+this.resultFile, '\ufeff频道,roomId,roomName,owner,观看人数\n');
		let channels = [
            {
                name:'游戏',
                channelNo:1
            },
            {
                name:'手机游戏',
                channelNo:9
            },
            {
                name:'鱼乐星天地',
                channelNo:2
            },
            {
                name:'鱼玩科技',
                channelNo:3
            }
        ];
        this.seed = [];
        channels.forEach(function(channel){
            this.seed.push({
                opt:{
                    uri:'http://capi.douyucdn.cn/api/v1/getColumnRoom/'+channel.channelNo,
                    qs:{
                        aid:'ios',
                        client_sys:'ios',
                        limit:20,
                        offset:0,
                        time:Date.now()
                    },
                    params:{
                        channel:channel
                    }
                },
                next:'getList'
            });
        }, this);
        done();
    },
    onData:function(dataSet) {
		if(dataSet.get('data')) {
		    fs.appendFileSync(this.resultDir+this.resultFile, dataSet.get('data'));
		}
    },
    getList:function(ctx, done) {
    	let channel = ctx.params.channel;
    	delete ctx.params.channel;
    	let offset = ctx.params.offset;

    	let data = null;
    	try {
    		data = JSON.parse(ctx.content);
    	} catch(e) {
    		logger.error('[Channel %s, offset %s] get list json parse failed: %s', channel.name, offset, e);
    		done();
    		return;
    	}

    	let items = [];

        data.data.forEach(function(item){
            items.push([
                    channel.name,
                    item.room_id,
                    item.room_name.replace(/,/g, ''),
                    item.nickname.replace(/,/g, ''),
                    item.online
                ].join());
        });

    	logger.info('[Channel %s, offset %s] got %s live shows', channel.name, offset, items.length);

    	if(items.length) {
    		ctx.dataSet.set('data', items.join('\n')+'\n');
    		ctx.params.offset += 20;
            ctx.params.time = Date.now();
            ctx.tasks.push({
                opt:{
                    uri:'http://capi.douyucdn.cn/api/v1/getColumnRoom/'+channel.channelNo,
                    qs:ctx.params,
                    params:{
                        channel:channel
                    }
                },
                next:'getList'
            })
    	}

    	done();
    }
}

const Flowesh = require('flowesh'),
charsetparser = require('mof-charsetparser'),
iconv = require('mof-iconv'),
cheerio = require('mof-cheerio'),
normalizer = require('mof-normalizer'),
reqadapter = require('mof-reqadapter');

const env = 'development';
const config = require('./config.json')[env];

const flowesh = new Flowesh(config).attach(new Spider());

flowesh.requestmw.use(normalizer());
flowesh.requestmw.use(reqadapter());

flowesh.responsemw.use(charsetparser());
flowesh.responsemw.use(iconv());
flowesh.responsemw.use(cheerio());

flowesh.start();