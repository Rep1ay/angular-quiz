import { HttpClient, HttpParams } from '@angular/common/http';
import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WeatherApiCurrentResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime_epoch: number;
    localtime: string;
  };
  current: {
    last_updated_epoch: number;
    last_updated: string;
    temp_c: number;
    temp_f: number;
    is_day: 0 | 1;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_mph: number;
    wind_kph: number;
    wind_degree: number;
    wind_dir: string;
    pressure_mb: number;
    pressure_in: number;
    precip_mm: number;
    precip_in: number;
    humidity: number;
    cloud: number;
    feelslike_c: number;
    feelslike_f: number;
    vis_km: number;
    vis_miles: number;
    uv: number;
    gust_mph: number;
    gust_kph: number;
  };
}

export interface QueryParams { query: string; aqi?: boolean }


@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  private readonly MOCKED_PARAMS = { query: 'London', aqi: false }

  public readonly params$$ =  signal<QueryParams>(this.MOCKED_PARAMS);
  public readonly currentWeather$$ = signal<WeatherApiCurrentResponse | undefined>(undefined);

  // #region Effects
  private readonly weatherEffect$$ = effect(() => {
    this.fetchDefaultWeather();
  });
  // #endregion

  public fetchDefaultWeather(): void {
    // TODO: change query into a signal to make effect works
    const { query, aqi } = this.params$$();

    const httpParams = new HttpParams()
      .set('key', environment.weatherApi.apiKey)
      .set('q', query)
      .set('aqi', aqi ? 'yes' : 'no');
    // this.currentWeather$$
      this.http.get<WeatherApiCurrentResponse>(
      `${environment.weatherApi.baseUrl}/current.json`,
      { params: httpParams }
    ).pipe(takeUntilDestroyed(this.destroyRef),tap(response => this.currentWeather$$.set(response))).subscribe();
  }
}
