export enum ExternalURL {
  discord,
  twitter,
}

export const externalURL = (externalURL: ExternalURL) => {
  switch (externalURL) {
    case ExternalURL.discord:
      return 'http://example.com/discord';
    case ExternalURL.twitter:
      return 'https://twitter.com/ghost_nouns';
  }
};
