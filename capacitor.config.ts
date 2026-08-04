import type { CapacitorConfig } from '@capacitor/cli';

// const config: CapacitorConfig = {
//   appId: 'com.afzshare.app',
//   appName: 'AFZshare',
//   webDir: 'www'
// };

// export default config;


const config: CapacitorConfig = {
  appId: 'com.afzshare.app',
  appName: 'AFZshare',
  webDir: 'www',

  server: {
    url: 'http://10.144.234.241:3000',
    cleartext: true
  }
};

export default config;