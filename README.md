# mongoose-i18n-localize
[![Build Status](https://travis-ci.org/Spown/mongoose-i18n-localize.svg?branch=master)](https://travis-ci.org/Spown/mongoose-i18n-localize)
[![Maintainability](https://api.codeclimate.com/v1/badges/c57a9b2238b246cd9d3a/maintainability)](https://codeclimate.com/github/Spown/mongoose-i18n-localize/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/c57a9b2238b246cd9d3a/test_coverage)](https://codeclimate.com/github/Spown/mongoose-i18n-localize/test_coverage)
[![devDependencies Status](https://david-dm.org/Spown/mongoose-i18n-localize/dev-status.png)](https://david-dm.org/Spown/mongoose-i18n-localize?type=dev)
[![Build status](https://ci.appveyor.com/api/projects/status/1xpqlqiytps1mds3?svg=true)](https://ci.appveyor.com/project/Spown/mongoose-i18n-localize)

mongoose-i18n-localize is a mongoose plugin to support i18n and localization in your mongoose schemas.

It seems like [mongoose-i18n](https://github.com/elrolito/mongoose-i18n) is not longer supported and I didn't get it to work on my machine, so I decided to write my own version.

## Requirements

 - Node >= 4.0.0
 - Mongoose >= 4.12.2

## Usage

```
npm install mongoose-i18n-localize
```

Create your schema:

```js
var mongoose = require('mongoose');
var mongooseI18n = require('mongoose-i18n-localize');

var schema = new mongoose.Schema({
	name: {
		type: String,
		i18n: true
	}
});

schema.plugin(mongooseI18n, {
	locales: ['en', 'de'],
	defaultLocale: 'de' // if not specified or invalid - will assume locales[0]
});

var Model = mongoose.model('Name', schema);
```

This will create a structure like:

```js
{
	name: {
		en: String,
		de: String
	}
}
```

All validators of `name` get also assigned to `name.en` and `name.de`.

Currently these field types (or an Array of these) support i18n: `String`, `Number`, `Boolean`, `Date`.

mongoose-i18n-localize adds the methods `toObjectLocalized()` and `toJSONLocalized()` to the i18n schema methods. To set the locale of a resource to `en`, just do:


```js
Model.find(function(err, resources) {
	var localizedResources = resources.toJSONLocalized('en');
});

//or

Model.find(function(err, resources) {
	var localizedResources = Model.schema.methods.toJSONLocalized(resources, 'en');
});
```

`localizedResources` has now the following structure:

```js
[
	{
		name: {
			en: 'hello',
			de: 'hallo',
			localized: 'hello'
		}
	}
]
```

Use `toObjectLocalized` or `toJSONLocalized` according to `toObject` or `toJSON`.

If you want the fields to assume only the localized values use the methods
`toObjectLocalizedOnly()` or
`toJSONLocalizedOnly()`.


```js
Model.find(function(err, resources) {
	var localizedResources = resources.toJSONLocalizedOnly('de');
});

```

`localizedResources` has now the following structure:

```js
[
	{
		name: 'hallo'
	}
]
```

All methods accept 3 optional arguments:
 1. ``resource`` (Object) - document(s) to localize
 2. ``localeName`` (String) - target locale to populate ``.localized`` subfield(in case of ``.toObjectLocalized(), .toJSONLocalized()``) or the field itself (``.toObjectLocalizedOnly(), .toJSONLocalizedOnly()``). Will use ``options.defaultLocale`` if omitted.
 3. ``defaultLocaleName`` (String) - locale to fallback, if the value for ``localeName`` is ``undefined``. Will also use ``options.defaultLocale`` if omitted.

 ```js
Model.find(function(err, resources) {
	var localizedResources;
	localizedResources = resources.toJSONLocalized();
	localizedResources = resources.toJSONLocalizedOnly('de');
	localizedResources = resources.toObjectLocalized(resources, 'de', 'en');
	localizedResources = resources.toObjectLocalizedOnly('de', 'en');
});
```

# Tests

To run the tests you need a local MongoDB instance available. Run with:

```
npm test
```
# Issues

Please use the GitHub issue tracker to raise any problems or feature requests.

If you would like to submit a pull request with any changes you make, please feel free!
