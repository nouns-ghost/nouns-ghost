export enum ExternalURL {
  discord,
  twitter,
  github,
  opensea,
}

export const externalURL = (externalURL: ExternalURL) => {
  switch (externalURL) {
    case ExternalURL.discord:
      return 'http://example.com/discord';
    case ExternalURL.twitter:
      return 'https://twitter.com/ghost_nouns';
    case ExternalURL.github:
      return 'https://github.com/nouns-ghost/nouns-ghost';
    case ExternalURL.opensea:
      return 'https://opensea.io/collection/ghost-nouns';
  }
};
