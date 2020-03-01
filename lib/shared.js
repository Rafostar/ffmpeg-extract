const fs = require('fs');
const { spawn } = require('child_process');
const debug = require('debug')('ffmpeg-extract:shared');
const vttparser = require('./vtt-parser');

exports.findInStreams = function(ffprobeData, name, value)
{
	if(ffprobeData && Array.isArray(ffprobeData.streams))
	{
		for(var i = 0; i < ffprobeData.streams.length; i++)
		{
			if(
				ffprobeData.streams[i][name]
				&& ffprobeData.streams[i][name] === value
			)
				return true;
		}
	}

	return false;
}

exports.findFileInDir = function(opts, cb)
{
	cb = cb || noop;

	if(!opts.dirPath)
		return cb(new Error('No search dir specified'));

	if(!opts.namesArr || !opts.namesArr.length)
		return cb(new Error('No array with file names provided'));

	fs.readdir(opts.dirPath, (err, files) =>
	{
		if(err) return cb(err);

		var checkArr = opts.namesArr;

		if(opts.dirsArr && opts.dirsArr.length)
			checkArr = [...checkArr, ...opts.dirsArr];

		var foundFile = checkArr.find(file => files.includes(file));

		if(!foundFile)
			return cb(new Error('Could not find matching file in search dir'));

		var fullPath = `${opts.dirPath}/${foundFile}`;

		if(!opts.checkDirs)
			return cb(null, fullPath);

		fs.stat(fullPath, (err, stats) =>
		{
			if(err) return cb(err);

			if(!stats.isDirectory())
				return cb(null, fullPath);

			opts.dirPath = fullPath;
			opts.dirsArr = null;
			opts.checkDirs = false;

			return exports.findFileInDir(opts, cb);
		});
	});
}

exports.convertFile = function(opts, cb)
{
	if(!opts.spawnArgs || !Array.isArray(opts.spawnArgs))
		return cb(new Error('No spawn args array'));

	opts.ffmpegPath = opts.ffmpegPath || '/usr/bin/ffmpeg';

	if(opts.vttparser)
		opts.spawnArgs.push('pipe:1');
	else
		opts.spawnArgs.push(opts.outPath, '-y');

	debug(`Convert opts: ${JSON.stringify(opts)}`);

	var called = false;
	var spawnProcess = spawn(opts.ffmpegPath, opts.spawnArgs);

	const onConvertExit = function(code)
	{
		spawnProcess.removeListener('error', onConvertError);

		if(called) return;

		debug('Finished extracting');

		if(code)
		{
			called = true;
			return cb(new Error(`Extract process exit code: ${code}`));
		}
		else if(!opts.vttparser)
		{
			called = true;
			return cb(null);
		}
	}

	const onConvertError = function(code)
	{
		spawnProcess.removeListener('exit', onConvertExit);

		if(called) return;

		called = true;
		return cb(new Error(`Extract process error code: ${code}`));
	}

	spawnProcess.once('exit', onConvertExit);
	spawnProcess.once('error', onConvertError);

	if(!opts.vttparser) return;

	vttparser(spawnProcess.stdout, (err, data) =>
	{
		if(called) return;

		if(err)
		{
			called = true;
			return cb(err);
		}

		fs.writeFile(opts.outPath, data, (err) =>
		{
			if(called) return;

			called = true;
			return cb(err);
		});
	});
}

exports.getPossibleNames = function(fileNames, extensions)
{
	var result = [];

	fileNames.forEach(name =>
	{
		extensions.forEach(ext =>
		{
			result.push(name + '.' + ext);
		});
	});

	return result;
}
