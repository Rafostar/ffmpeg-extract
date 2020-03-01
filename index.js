const ffprobe = require('ffprobe-mini');
const debug = require('debug')('ffmpeg-extract');
const video = require('./lib/video');
const music = require('./lib/music');
const noop = () => {};

module.exports =
{
	video: video,
	music: music,
	analyzeFile: function(opts, cb)
	{
		cb = cb || noop;

		if(!opts.filePath)
			return cb(new Error('No file path to analyze'));

		debug(`Analyzing: ${opts.filePath}`);
		ffprobe(opts, (err, data) =>
		{
			if(err)
			{
				debug(err);
				return cb(err);
			}

			debug(`Successfully analized: ${opts.filePath}`);
			cb(null, data);
		});
	}
}
