import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Share } from '@capacitor/share';

import {
  IonContent,
  IonButton,
  IonIcon,
  AlertController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  phonePortraitOutline,
  qrCodeOutline,
  wifiOutline,
  bluetoothOutline,
  locationOutline,
  checkmarkCircle,
  arrowUpOutline,
  arrowDownOutline,
  helpOutline,
  searchOutline,
  shareSocialOutline,
  timeOutline,
  documentOutline,
  personOutline,
  closeCircle,
  ellipseOutline,
  personAddOutline
} from 'ionicons/icons';
import { Router } from '@angular/router';

@Component({
  selector: 'app-share',
  templateUrl: './share.page.html',
  styleUrls: ['./share.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon
  ]
})
export class SharePage implements OnInit {

  constructor( private alertController: AlertController, private router: Router) {
    addIcons({
  'chevron-forward-outline': chevronForwardOutline,
  'phone-portrait-outline': phonePortraitOutline,
  'qr-code-outline': qrCodeOutline,
  'wifi-outline': wifiOutline,
  'bluetooth-outline': bluetoothOutline,
  'location-outline': locationOutline,
  'checkmark-circle': checkmarkCircle,
  'arrow-up-outline': arrowUpOutline,
  'arrow-down-outline': arrowDownOutline,
  'help-outline': helpOutline,
  'search-outline': searchOutline,
  'share-social-outline': shareSocialOutline,
  'time-outline': timeOutline,
  'document-outline': documentOutline,
  'person-outline': personOutline,
  'person-add-outline': personAddOutline,
  'close-circle': closeCircle,
  'ellipse-outline': ellipseOutline
});
  }

  ngOnInit(): void {
  }


sendFile() {
  this.router.navigate(['/select-items']);
}

  receiveFile() {
    console.log('Receive clicked');
    this.router.navigate(['/receive']);
  }

  async inviteFriends() {
    console.log('Invite Friends clicked');
  try {
    await Share.share({
      title: 'AFZShare',
      text: 'Transfer files instantly with AFZShare. Download now!',
      url: 'https://play.google.com/store/apps/details?id=com.afzshare.app',
      dialogTitle: 'Invite Friends'
    });
  } catch (error) {
    console.error('Share cancelled', error);
  }
}

async showHelp() {
  const alert = await this.alertController.create({
    header: '📤 AFZShare Guide',
    cssClass: 'help-alert',
    message:
      '• Tap Send to choose files and share them.\n\n' +
      '• Tap Receive to wait for incoming files.\n\n' +
      '• Enable Bluetooth and Wi-Fi for device discovery.\n\n' +
      '• Files are transferred directly between devices.\n\n' +
      '• Supported: Photos, Videos, Documents, Music, APKs.',
    buttons: ['Got it']
  });

  await alert.present();
}
  
}