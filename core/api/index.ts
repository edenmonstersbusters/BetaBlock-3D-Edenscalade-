
import { wallsApi } from './walls';
import { socialApi } from './social';
import { profileApi } from './profile';
import { notificationsApi } from './notifications';

export const api = {
  ...wallsApi,
  ...socialApi,
  ...profileApi,
  ...notificationsApi
};
