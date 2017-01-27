/* jshint node: true */
'use strict';
function ArrNoDupe(a) {
    var temp = {}, r = [], i = 0, k;
    for (i ; i < a.length; i++) {temp[a[i]] = true;}
    for (k in temp){ if (temp.hasOwnProperty(k)) {r.push(k);} }
    return r;
}
module.exports = function(schema, options) {
	var options_locales = ArrNoDupe((options||{}).locales||[]);
	function addLocales(pathname, schema) {
		var instance = schema.paths[pathname].instance,
			config = schema.paths[pathname].options
		;
		if (config.i18n && instance === 'String') {
			delete(config.i18n);
			config._i18n = true;
			schema.remove(pathname);

			options_locales.forEach(function(locale) {
				schema.path(pathname + '.' + locale, config);
			});
		}
	}

	function recursiveIteration(schema) {
		for (var key in schema.paths) {
			if (schema.paths.hasOwnProperty(key)) {
				var sPath = schema.paths[key];
				if (sPath.schema) {
					recursiveIteration(sPath.schema);
				} else {
					addLocales(sPath.path, schema);
				}
			}
		}
	}

	if (options_locales.length > 0) {
		recursiveIteration(schema);
	}

	function getI18nCapsulePaths(prePath, schema) {
		var i18nPathCapsules = [], i18nCapsulePathMask = /^(.*)\.[^\.]*$/;
		for (var schemaPath in schema.paths) {
			if (schema.paths.hasOwnProperty(schemaPath)) {
				var schemaField = schema.paths[schemaPath];
				if (schema.childSchemas.indexOf(schemaField.schema) !== -1) {
					i18nPathCapsules = i18nPathCapsules.concat(getI18nCapsulePaths(prePath+(prePath&&'.')+schemaPath, schemaField.schema));
				} else if (schemaField.options._i18n) {
					var i18nCapsulePath = (prePath+(prePath&&'.')+schemaPath).replace(i18nCapsulePathMask, '$1');
					if (i18nPathCapsules.indexOf(i18nCapsulePath) === -1) {
						i18nPathCapsules.push(i18nCapsulePath);
					}
				}
			}
		}
		return i18nPathCapsules;
	}

	function localyzeCapsule(obj, slug, locale, localeDefault, only) {
		var val, defVal;
		if (obj[slug]) {
			locale && (val = obj[slug][locale]);
			localeDefault && (defVal = obj[slug][localeDefault]);
			if (only) {
				obj[slug] = val || defVal;
			} else {
				obj[slug].localized = val || defVal;
			}
		}
	}

	function localyzeRecursive(obj, i18nCapsulePathArr, locale, localeDefault, only) {
		var thisSubObjPath = i18nCapsulePathArr[0],
			thisSubObj = obj[thisSubObjPath]
		;
		if (i18nCapsulePathArr.length === 1) {
			if (obj instanceof Array) {
				obj.map(function (i) {
					localyzeCapsule(i, thisSubObjPath, locale, localeDefault, only);
				});
			} else {
				localyzeCapsule(obj, thisSubObjPath, locale, localeDefault, only);
			}
		} else if (i18nCapsulePathArr.length > 1) {
			if (thisSubObj instanceof Array) {
				thisSubObj.map(function (i) {
					localyzeRecursive(i, i18nCapsulePathArr.slice(1), locale, localeDefault, only);
				});
			} else {
				localyzeRecursive(thisSubObj, i18nCapsulePathArr.slice(1), locale, localeDefault, only);
			}
		}
	}

	function addLocalized(obj, locale, localeDefault, toJSON, only) {
		var _obj = toJSON ? obj.toJSON() : obj.toObject(),
			i18nCapsulePaths = getI18nCapsulePaths('', obj.schema) || [],
			val, defVal
		;
		i18nCapsulePaths.forEach(function(i18nCapsulePath) {
			var i18nCapsulePathArr = i18nCapsulePath.split('.');
			localyzeRecursive(_obj, i18nCapsulePathArr, locale, localeDefault, only);
		});
		return _obj;
	}

	function guessMorphAndApply(_this, args, extra, methodNAme) {
		var newArgs=[], argsNum = 3, target = args[0], ret, localeName;
		if (typeof args[0] === 'string') {
			localeName = args[0];
		} else if (typeof args[1] === 'string') {
			localeName = args[1];
		}
		if (!localeName) {
			throw new Error('mongoose-i18n-localize: '+methodNAme+'(): no valid locale name argument specified!')
		}
		if (localeName && _this.hasOwnProperty('isNew')) {
			newArgs.push(target = _this);
			argsNum = 2;
		}
		for (var i = 0; i < argsNum; i++) {
			newArgs.push(args[i]);
		}
		(extra||[]).forEach(function(i) {
			newArgs.push(i);
		});
		if (target instanceof Array) {
			ret = target.map(function(object) {
				return addLocalized.apply(_this, newArgs);
			});
		} else {
			ret = addLocalized.apply(_this, newArgs);
		}
		return ret;
	}

	schema.methods.toJSONLocalized = function() {
		return guessMorphAndApply(this, arguments, [true, false], 'toJSONLocalized');
	};

	schema.methods.toObjectLocalized = function() {
		return guessMorphAndApply(this, arguments, [false, false], 'toObjectLocalized');
	};

	schema.methods.toJSONLocalizedOnly = function() {
		return guessMorphAndApply(this, arguments, [true, true], 'toJSONLocalizedOnly');
	};

	schema.methods.toObjectLocalizedOnly = function() {
		return guessMorphAndApply(this, arguments, [false, true], 'toObjectLocalizedOnly');
	};
};
