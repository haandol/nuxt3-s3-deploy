import * as path from 'path';
import * as joi from 'joi';
import * as toml from 'toml';
import * as fs from 'fs';

interface IConfig {
  app: {
    ns: string;
    stage: string;
  };
  aws: {
    region: string;
  };
  build: {
    path: string;
  };
  domain?: {
    acmCertArn?: string;
    altDomains?: string[];
  };
  repository: {
    name: string;
    branch: string;
    region: string;
  };
  notification?: {
    hookUrl: string;
  };
}

const cfg = toml.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '.toml'), 'utf-8')
);
console.log('loaded config', cfg);

const schema = joi
  .object({
    app: joi.object({
      ns: joi.string().required(),
      stage: joi.string().required(),
    }),
    aws: joi.object({
      region: joi.string().required(),
    }),
    domain: joi
      .object({
        acmCertArn: joi.string().optional(),
        altDomains: joi.array().items(joi.string()).optional(),
      })
      .optional(),
    build: joi.object({
      path: joi.string(),
    }),
    repository: joi.object({
      name: joi.string(),
      branch: joi.string(),
      region: joi.string(),
    }),
    notification: joi
      .object({
        hookUrl: joi.string(),
      })
      .optional(),
  })
  .unknown();

const { error } = schema.validate(cfg);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const Config: IConfig = {
  ...cfg,
  app: {
    ...cfg.app,
    ns: `${cfg.app.ns}${cfg.app.stage}`,
  },
};
