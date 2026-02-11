import { Routes } from '@angular/router';
import { App } from './app';
import { SettingsPage } from './settings-page/settings-page';
import { CurrentWeatherSection } from './current-weather-section/current-weather-section';

export const routes: Routes = [
  {path: '', component: CurrentWeatherSection},
  {
    path: 'settings', component: SettingsPage,
    providers: []
  }
];
