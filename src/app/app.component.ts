import { Component } from '@angular/core';
import { App } from '@capacitor/app';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {

  App.addListener('backButton', ({ canGoBack }) => {

    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }

  });

}
}
