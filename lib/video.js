const fs = require('fs');
const path = require('path');
const chardet = require('chardet');
const debug = require('debug')('ffmpeg-extract:video');
const extractShared = require('./shared');
const noop = () => {};

exports.subsProcess = false;

exports.subsToVtt = function(opts, cb)
{
	cb = cb || noop;

	if(!opts)
		return cb(new Error('No convert subs options'));

	if(!opts.file)
		return cb(new Error('No subtitles file specified'));

	if(!opts.outPath && !opts.outDir)
		return cb(new Error('No subtitles output file path'));

	exports.subsProcess = true;

	if(!opts.outPath && opts.outDir)
	{
		var parsed = path.parse(opts.file);
		opts.outPath = `${opts.outDir}/${parsed.name}.vtt`;
	}

	if(opts.overwrite)
	{
		if(opts.isVideo) convertToVtt(opts, cb);
		else checkAndConvert(opts, cb);
	}
	else
	{
		fs.access(opts.outPath, fs.constants.F_OK, (err) =>
		{
			if(!err)
			{
				exports.subsProcess = false;
				return cb(null);
			}

			if(opts.isVideo) convertToVtt(opts, cb);
			else checkAndConvert(opts, cb);
		});
	}
}

exports.videoToVtt = function(opts, cb)
{
	if(!opts)
		return cb(new Error('No extract video subs options'));

	opts.isVideo = true;
	exports.subsToVtt(opts, cb);
}

exports.getIsVideo = function(ffprobeData)
{
	return extractShared.findInStreams(
		ffprobeData, 'codec_type', 'video'
	);
}

exports.getIsSubsMerged = function(ffprobeData)
{
	var isVideo = exports.getIsVideo(ffprobeData);

	if(!isVideo)
		return false;

	return extractShared.findInStreams(
		ffprobeData, 'codec_type', 'subtitle'
	);
}

exports.getSubsCharEnc = function(filePath, cb)
{
	fs.readFile(filePath, (err, data) =>
	{
		if(err)
		{
			exports.subsProcess = false;
			return cb(err);
		}

		var foundChar = chardet.detect(data);

		if(foundChar)
		{
			debug(`Detected subs char encoding: ${foundChar}`);
			return cb(null, foundChar);
		}
		else
		{
			exports.subsProcess = false;
			return cb(new Error('Could not detect subtitles encoding'));
		}
	});
}

function checkAndConvert(opts, cb)
{
	if(opts.charEnc)
		return convertToVtt(opts, cb);

	exports.getSubsCharEnc(opts.file, (err, charEnc) =>
	{
		if(err) return cb(err);

		opts.charEnc = charEnc;
		convertToVtt(opts, cb);
	});
}

function convertToVtt(opts, cb)
{
	opts.charEnc = opts.charEnc || 'UTF-8';

	opts.spawnArgs = [
		'-sub_charenc', opts.charEnc,
		'-i', opts.file,
		'-f', 'webvtt'
	];

	extractShared.convertFile(opts, (err) =>
	{
		exports.subsProcess = false;
		cb(err);
	});
}
