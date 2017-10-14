/* jshint node: true */
'use strict';
function ArrNoDupe(a) {
    var temp = {}, r = [], i = 0, k;
    for (i ; i < a.length; i++) {temp[a[i]] = true;}
    for (k in temp){ if (temp.hasOwnProperty(k)) {r.push(k);} }
    return r;
}
module.exports = function(schema, options) {
	options = options||{};
	var options_locales = ArrNoDupe(options.locales||[]),
		options_defaultLocale = options.defaultLocale,
		_i18n_paths = []
	;
	function addLocales(prePath, pathname, schema) {
		var instance = schema.paths[pathname].instance,
			config = schema.paths[pathname].options
		;
		if ( config.i18n && typeof instance === 'string' && instance.match(/^(String|Number|Boolean|Date)$/i) ) {
			delete(config.i18n);
			config._i18n = true;
			schema.remove(pathname);
			_i18n_paths.push(prePath+(prePath&&'.')+pathname);

			options_locales.forEach(function(locale) {
				schema.path(pathname + '.' + locale, config);
			});
		}
	}

	function recursiveIteration(prePath, schema) {
		for (var key in schema.paths) {
			if (schema.paths.hasOwnProperty(key)) {
				var sPath = schema.paths[key];
				if (sPath.schema) {
					recursiveIteration(prePath+(prePath&&'.')+key, sPath.schema);
				} else {
					addLocales(prePath, sPath.path, schema);
				}
			}
		}
	}

	if (options_locales.length > 0) {
		recursiveIteration('', schema);
		if ( !~options_locales.indexOf(options_defaultLocale)) {
			options_defaultLocale = options_locales[0];
		}
	}
	schema.set('_i18n_paths', _i18n_paths);

	function getI18nCapsulePaths(prePath, schema) {
		var i18nPathCapsules = [], i18nCapsulePathMask = /^(.*)\.[^\.]*$/;
		for (var schemaPath in schema.paths) {
			if (schema.paths.hasOwnProperty(schemaPath)) {
				var schemaField = schema.paths[schemaPath];
				if (schema.childSchemas.find(function(modSch) {
					return modSch.schema === schemaField.schema;
				})) {
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

	function localyzeCapsule(obj, slug, locale, defaultLocale, only) {
		var val, defVal;
		if (obj[slug]) {
			locale && (val = obj[slug][locale]);
			defVal = defaultLocale ? obj[slug][defaultLocale] : obj[slug][options_defaultLocale];
			val = (typeof val !== 'undefined') ? val : defVal;
			if (only) {
				obj[slug] = val;
			} else {
				obj[slug].localized = val;
			}
		}
	}

	function localyzeRecursive(obj, i18nCapsulePathArr, locale, defaultLocale, only) {
		var thisSubObjPath = i18nCapsulePathArr[0],
			thisSubObj = obj[thisSubObjPath]
		;
		if (i18nCapsulePathArr.length === 1) {
			if (obj instanceof Array) {
				obj.map(function (i) {
					localyzeCapsule(i, thisSubObjPath, locale, defaultLocale, only);
				});
			} else {
				localyzeCapsule(obj, thisSubObjPath, locale, defaultLocale, only);
			}
		} else if (thisSubObj && i18nCapsulePathArr.length > 1) {
			if (thisSubObj instanceof Array) {
				thisSubObj.map(function (i) {
					localyzeRecursive(i, i18nCapsulePathArr.slice(1), locale, defaultLocale, only);
				});
			} else {
				localyzeRecursive(thisSubObj, i18nCapsulePathArr.slice(1), locale, defaultLocale, only);
			}
		}
	}

	function addLocalized(o) {
		var _obj = o.toJSON ? o.obj.toJSON() : o.obj.toObject(),
			val, defVal , _i18n_paths = getI18nCapsulePaths('', o.obj.schema) || []
		;
		_i18n_paths.forEach(function(i18nCapsulePath) {
			var i18nCapsulePathArr = i18nCapsulePath.split('.');
			localyzeRecursive(_obj, i18nCapsulePathArr, o.locale, o.localeDefault, o.only);
		});
		return _obj;
	}

	function guessMorphAndApply(_this, args, extra, methodNAme) {
		var o={}, target, ret;
		if (typeof args[0] === 'string') {
			o.locale = args[0];
		} else if (args[0] && args[0].hasOwnProperty('isNew')) {
			target = args[0];
		}
		if (!o.locale && typeof args[1] === 'string') {
			o.locale = args[1];
		} else if (o.locale && typeof args[1] === 'string') {
			o.localeDefault = args[1];
		}
		if (target && typeof args[2] === 'string') {
			o.localeDefault = args[2];
		}
		if (!target && _this.hasOwnProperty('isNew')) {
			target = _this;
		}
		if (!o.localeDefault) {
			o.localeDefault = options_defaultLocale;
		}
		if (!o.locale) {
			o.locale = options_defaultLocale;
		}
		o.toJSON = extra[0];
		o.only = extra[1];
		if (target instanceof Array) {
			ret = target.map(function(subTarget) {
				o.obj = subTarget;
				return addLocalized(o);
			});
		} else {
			o.obj = target;
			ret = addLocalized(o);
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
