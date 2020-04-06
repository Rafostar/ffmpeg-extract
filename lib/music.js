const fs = require('fs');
const path = require('path');
const extractShared = require('./shared');
const noop = () => {};

exports.coverProcess = false;

exports.coverToJpg = function(opts, cb)
{
	cb = cb || noop;

	if(!opts.file)
		return cb(new Error('No music file specified'));

	if(!opts.outPath && !opts.outDir)
		return cb(new Error('No cover output file path'));

	exports.coverProcess = true;

	if(!opts.outPath && opts.outDir)
	{
		var parsed = path.parse(opts.file);
		opts.outPath = `${opts.outDir}/${parsed.name}.jpg`;
	}

	if(opts.overwrite)
		convertCoverToJpg(opts, cb);
	else
	{
		fs.access(opts.outPath, fs.constants.F_OK, (err) =>
		{
			if(!err)
			{
				exports.coverProcess = false;
				return cb(null);
			}

			convertCoverToJpg(opts, cb);
		});
	}
}

exports.getPossibleCoverNames = function(nameArr, extArr)
{
	if(!Array.isArray(nameArr)) return null;
	else if(!Array.isArray(extArr)) return null;

	var possible = [];

	const updatePossible = function(ext)
	{
		nameArr.forEach(coverName =>
		{
			possible.push(coverName + ext);
			possible.push(coverName.charAt(0).toUpperCase() + coverName.slice(1) + ext);
			possible.push(coverName.toUpperCase() + ext);
		});
	}

	extArr.forEach(coverExt =>
	{
		updatePossible(coverExt);
		updatePossible(coverExt.toUpperCase());
	});

	return possible;
}

exports.findCoverInDir = function(dirPath, coverArr, cb)
{
	extractShared.findFileInDir({ dirPath: dirPath, namesArr: coverArr }, cb);
}

exports.getIsAudio = function(ffprobeData)
{
	return extractShared.findInStreams(
		ffprobeData, 'codec_type', 'audio'
	);
}

exports.getIsCoverMerged = function(ffprobeData)
{
	return extractShared.findInStreams(
		ffprobeData, 'codec_name', 'mjpeg'
	);
}

exports.getMetadata = function(ffprobeData)
{
	const metadata = ffprobeData.format.tags;
	var parsedMetadata = {};

	if(metadata && metadata.TITLE)
	{
		for(var name in metadata)
			parsedMetadata[name.toLowerCase()] = metadata[name];
	}
	else if(metadata && metadata.title)
		parsedMetadata = metadata;
	else
		parsedMetadata = null;

	return parsedMetadata;
}

function convertCoverToJpg(opts, cb)
{
	opts.spawnArgs = [
		'-i', opts.file,
		'-c', 'copy',
		opts.outPath, '-y'
	];

	extractShared.convertFile(opts, (err) =>
	{
		exports.coverProcess = false;
		cb(err);
	});
}
