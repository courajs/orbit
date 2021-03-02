import { RecordSchema } from '../src/record-schema';
import { UninitializedRecord } from '../src/record';
import { delay } from './support/timing';

const { module, test } = QUnit;

///////////////////////////////////////////////////////////////////////////////

module('RecordSchema', function () {
  test('can be instantiated', function (assert) {
    const schema = new RecordSchema();
    assert.ok(schema);
  });

  test('#version is assigned `1` by default', function (assert) {
    const schema = new RecordSchema();
    assert.equal(schema.version, 1, 'version === 1');
  });

  test('#upgrade bumps the current version, emits the `upgrade` event, and awaits any listener responses', async function (assert) {
    assert.expect(8);

    const schema = new RecordSchema({
      models: {
        planet: {}
      }
    });
    assert.equal(schema.version, 1, 'version === 1');

    const DELAY = 50;

    schema.on('upgrade', async (version) => {
      assert.equal(version, 2, 'version is passed as argument');
      assert.equal(schema.version, 2, 'version === 2');
      assert.ok(
        schema.getModel('planet').attributes?.name,
        'model attribute has been added'
      );
      await delay(DELAY);
    });

    schema.on('upgrade', async (version) => {
      assert.equal(version, 2, 'version is passed as argument');
      assert.equal(schema.version, 2, 'version === 2');
      assert.ok(
        schema.getModel('planet').attributes?.name,
        'model attribute has been added'
      );
      await delay(DELAY);
    });

    const startTime = new Date().getTime();

    await schema.upgrade({
      models: {
        planet: {
          attributes: {
            name: { type: 'string' }
          }
        }
      }
    });

    const endTime = new Date().getTime();
    const elapsedTime = endTime - startTime;
    assert.ok(
      elapsedTime < 2 * DELAY,
      'upgrade listeners performed in parallel'
    );
  });

  test('#models provides access to model definitions', function (assert) {
    const planetDefinition = {
      attributes: {
        name: { type: 'string' }
      }
    };

    const schema = new RecordSchema({
      models: {
        planet: planetDefinition
      }
    });

    assert.deepEqual(
      schema.models.planet.attributes,
      planetDefinition.attributes
    );
  });

  test('#getModel provides access to a model definition', function (assert) {
    const planetDefinition = {
      attributes: {
        name: { type: 'string' }
      }
    };

    const schema = new RecordSchema({
      models: {
        planet: planetDefinition
      }
    });

    assert.deepEqual(
      schema.getModel('planet').attributes,
      planetDefinition.attributes
    );
  });

  test('#getModel throws an exception if a model definition is not found', function (assert) {
    const schema = new RecordSchema();

    assert.throws(function () {
      schema.getModel('planet');
    }, /Schema error: Model definition for planet not found/);
  });

  test('#hasAttribute', function (assert) {
    const schema = new RecordSchema({
      models: {
        planet: {
          attributes: {
            name: { type: 'string' }
          }
        }
      }
    });

    assert.equal(schema.hasAttribute('planet', 'name'), true);
    assert.equal(schema.hasAttribute('planet', 'unknown'), false);
  });

  test('#hasRelationship', function (assert) {
    const schema = new RecordSchema({
      models: {
        planet: {
          relationships: {
            moons: { kind: 'hasMany', type: 'moon' }
          }
        },
        moon: {}
      }
    });

    assert.equal(schema.hasRelationship('planet', 'moons'), true);
    assert.equal(schema.hasRelationship('planet', 'unknown'), false);
  });

  test('#getAttribute', function (assert) {
    const schema = new RecordSchema({
      models: {
        planet: {
          attributes: {
            name: { type: 'string' }
          }
        }
      }
    });

    assert.deepEqual(schema.getAttribute('planet', 'name'), { type: 'string' });
  });

  test('#eachAttribute', function (assert) {
    const schema = new RecordSchema({
      models: {
        planet: {
          attributes: {
            name: { type: 'string' }
          },
          relationships: {
            moons: { kind: 'hasMany', type: 'moon' }
          }
        },
        moon: {}
      }
    });

    let attributes: any = {};

    schema.eachAttribute('planet', (name, attribute) => {
      attributes[name] = attribute;
    });

    assert.deepEqual(attributes, {
      name: { type: 'string' }
    });
  });

  test('#getRelationship', function (assert) {
    const schema = new RecordSchema({
      models: {
        planet: {
          relationships: {
            moons: { kind: 'hasMany', type: 'moon' }
          }
        },
        moon: {}
      }
    });

    assert.deepEqual(schema.getRelationship('planet', 'moons'), {
      kind: 'hasMany',
      type: 'moon'
    });
  });

  test('#eachRelationship', function (assert) {
    const schema = new RecordSchema({
      models: {
        planet: {
          attributes: {
            name: { type: 'string' }
          },
          relationships: {
            moons: { kind: 'hasMany', type: 'moon' }
          }
        },
        moon: {}
      }
    });

    let relationships: any = {};

    schema.eachRelationship('planet', (name, relationship) => {
      relationships[name] = relationship;
    });

    assert.deepEqual(relationships, {
      moons: { kind: 'hasMany', type: 'moon' }
    });
  });

  test('#pluralize simply adds an `s` to the end of words', function (assert) {
    const schema = new RecordSchema();
    assert.equal(schema.pluralize('cow'), 'cows', 'no kine here');
  });

  test('#singularize simply removes a trailing `s` if present at the end of words', function (assert) {
    const schema = new RecordSchema();
    assert.equal(schema.singularize('cows'), 'cow', 'no kine here');
    assert.equal(schema.singularize('data'), 'data', 'no Latin knowledge here');
  });

  test('#generateId', function (assert) {
    const schema = new RecordSchema({
      generateId: (modelName) => `${modelName}-123`,

      models: {
        moon: {}
      }
    });

    assert.equal(
      schema.generateId('moon'),
      'moon-123',
      'provides the default value for the ID'
    );
  });

  test('#initializeRecord', function (assert) {
    const schema = new RecordSchema({
      generateId: (modelName) => `${modelName}-123`,

      models: {
        moon: {}
      }
    });

    let moon: UninitializedRecord = { type: 'moon' };
    schema.initializeRecord(moon);
    assert.equal(moon.id, 'moon-123', 'generates an ID if `id` is undefined');

    moon = { type: 'moon', id: '234' };
    assert.equal(moon.id, '234', 'does not alter an `id` that is already set');
  });
});