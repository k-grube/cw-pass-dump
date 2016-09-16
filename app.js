const dotenv = require('dotenv');
dotenv.load({path: '.env'});
const _ = require('lodash');
const ConnectWise = require('connectwise-rest');

const cw = new ConnectWise({
  companyId: process.env.CW_COMPANY_ID,
  publicKey: process.env.CW_PUBLIC_KEY,
  privateKey: process.env.CW_PRIVATE_KEY,
  companyUrl: process.env.CW_COMPANY_URL
});

const getConfigQuestions = (id) => {
  return cw.API.api(`/company/configurations/types/${id}/questions`, 'GET', {});
};

const getConfigTypes = () => {
  return cw.API.api('/company/configurations/types', 'GET', {conditions: 'inactiveFlag = false', pageSize: 200})
    .then(configTypes => {
      const configurationTypes = [];
      configTypes.forEach(configType => {
        const {id, name} = configType;
        configurationTypes.push({id, name});
      });
      return configurationTypes;
    });
};

const getConfigTypesWithUserOrPass = () => {
  return getConfigTypes()
    .then(types => {
      const promises = [];
      const mapping = [];
      types.forEach((type) => {
        promises.push(getConfigQuestions(type.id));
        mapping.push(type.id);
      });
      return Promise.all(promises)
        .then(questions => {
          const typesWithPassword = [];
          const typesWithUsername = [];
          questions.forEach((question, idx) => {
            question.forEach((questionType, idy) => {
              if (questionType.fieldType === 'Password') typesWithPassword.push([mapping[idx], idy]);
              if (questionType.question === 'Username') typesWithUsername.push([mapping[idx], idy]);
            })
          });
          return {typesWithPassword, typesWithUsername};
        });
    });
};

const getUsernamesAndPasswords = () => {
  return getConfigTypesWithUserOrPass()
    .then(({typesWithPassword, typesWithUsername}) => {

      const passwordPromises = [], usernamePromises = [];

      typesWithPassword.forEach(configType => {
        passwordPromises.push(cw.API.api('/company/configurations', 'GET', {conditions: `type/id = ${configType[0]}`}));
      });

      typesWithUsername.forEach(configType => {
        usernamePromises.push(cw.API.api('/company/configurations', 'GET', {conditions: `type/id = ${configType[0]}`}));
      });

      const getPasswords = (promises) => {
        return Promise.all(promises)
          .then(results => {
            const foundPasswords = {};
            results.forEach((configurations, idx) => {
              configurations.forEach(configuration => {
                if (!foundPasswords[configuration.id]) {
                  foundPasswords[configuration.id] = {usernames: [], passwords: []};
                }
                foundPasswords[configuration.id].passwords.push({
                  password: configuration.questions[typesWithPassword[idx][1]].answer,
                  questionId: configuration.questions[typesWithPassword[idx][1]].questionId,
                  answerId: configuration.questions[typesWithPassword[idx][1]].answerId,
                  configId: configuration.id
                });
              });
            });
            return foundPasswords;
          });
      };

      const getUsernames = (promises) => {
        return Promise.all(promises)
          .then(results => {
            const foundUsernames = {};
            results.forEach((configurations, idx) => {
              configurations.forEach(configuration => {
                if (!foundUsernames[configuration.id]) {
                  foundUsernames[configuration.id] = {usernames: [], passwords: []};
                }
                foundUsernames[configuration.id].usernames.push({
                  username: configuration.questions[typesWithUsername[idx][1]].answer,
                  questionId: configuration.questions[typesWithUsername[idx][1]].questionId,
                  answerId: configuration.questions[typesWithUsername[idx][1]].answerId,
                  configId: configuration.id
                });
              });
            });
            return foundUsernames;
          });
      };

      // return getUsernames(usernamePromises);

      return Promise.all([getUsernames(usernamePromises), getPasswords(passwordPromises)])
        .then(results => results);
    });
};

// foundConfigs[0] = users, 1 = passwords
const collateResults = (foundConfigs) => {
  const userConfigs = foundConfigs[0], passwordConfigs = foundConfigs[1];
  const collated = [];
  Object.keys(userConfigs).forEach(configId => {
    const {usernames} = userConfigs[configId], {passwords} = passwordConfigs[configId];
    const ids = _.findIndex(collated, {configId});
    if (ids > -1) {
      collated[ids].usernames.push(usernames);
      collated[ids].passwords.push(passwords);
    } else {
      collated.push({
        configId,
        usernames,
        passwords
      })
    }
  });
  return collated;
};

getUsernamesAndPasswords()
  .then(collateResults)
  .then(results => {
    console.log(JSON.stringify(results, null, 2));
  })
  .catch(err => {
    console.error('An error occurred', err);
  });
