export type EpicGame = {
  app_name: string;
  app_title: string;
  metadata: {
    title: string;
    description: string;
    keyImages: {
      type: string;
      url: string;
    }[];
  };
};
