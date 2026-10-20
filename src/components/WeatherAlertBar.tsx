import type { CityWeather } from '../data/catalog';
import type { WeatherAlert } from '../domain/alerts';
import { IconAlert, IconArrow, IconBell, IconRefresh } from './icons';

interface Props {
  cityName: string;
  weather?: CityWeather;
  alerts: WeatherAlert[];
  tripDates: string[];
  notifyState: 'default' | 'granted' | 'denied' | 'unsupported';
  onEnableNotify: () => void;
  onFixItem: (itemId: string) => void;
  onOpenItem: (itemId: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

const SRC_LABEL: Record<string, string> = {
  weather: '中国天气网',
  seed: '内置数据集',
};

/**
 * 天气提醒条。
 *
 * 数据来自爬虫抓的七天预报（catalog.weather），不是模拟值；
 * 抓不到时整条不渲染 —— 宁可不显示，也不拿假数据提醒用户改行程。
 */
export default function WeatherAlertBar(props: Props) {
  const { cityName, weather, alerts, tripDates, notifyState, onEnableNotify, onFixItem, onOpenItem, onRefresh, loading } =
    props;

  if (!weather) return null;

  // 七天预报只能覆盖出发日之前的那一段。行程在预报之外时，明说「现在还看不到」，
  // 而不是拿今天的天气去糊弄一个「未来 4 天没有需要调整」。
  const covered = new Set(weather.daily.map((d) => d.date));
  const coveredTripDays = tripDates.filter((d) => covered.has(d)).length;
  const outOfRange = tripDates.length > 0 && coveredTripDays === 0;
  const range = weather.daily.length > 0 ? `${weather.daily[0].date.slice(5)} ~ ${weather.daily[weather.daily.length - 1].date.slice(5)}` : '';

  const now = weather.now;
  const days = weather.daily.slice(0, 4);

  return (
    <div className={`wx-bar ${alerts.length > 0 ? 'has-alert' : ''}`}>
      <div className="wx-top">
        <div className="wx-now">
          <span className="wx-city">{cityName}</span>
          {now ? (
            <>
              <b className="wx-temp">{now.temp}℃</b>
              <span className="wx-text">{now.text}</span>
              <span className="wx-sub">
                {now.humidity != null ? `湿度 ${now.humidity}%` : ''}
                {now.wind ? ` · ${now.wind}` : ''}
              </span>
            </>
          ) : (
            <span className="wx-sub">实况缺</span>
          )}
        </div>

        <div className="wx-forecast">
          {days.map((d) => (
            <div key={d.date} className="wx-day">
              <span>{d.date.slice(5).replace('-', '/')}</span>
              <b>{d.text}</b>
              <small>
                {d.low}~{d.high}℃
              </small>
            </div>
          ))}
        </div>

        <div className="wx-actions">
          <button className="btn btn-sm" onClick={onRefresh} disabled={loading} title="重新读一次爬虫结果">
            <IconRefresh size={11} />
          </button>
          {notifyState === 'granted' ? (
            <span className="wx-bell on">
              <IconBell size={11} /> 已开启
            </span>
          ) : notifyState === 'unsupported' ? null : (
            <button className="btn btn-sm" onClick={onEnableNotify} title="下雨前弹系统通知">
              <IconBell size={11} /> 提醒我
            </button>
          )}
          <span className="wx-src">{SRC_LABEL[weather.src] ?? weather.src}</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <ul className="wx-list">
          {alerts.map((a) => (
            <li key={a.id} className={a.level}>
              <IconAlert size={11} />
              <div className="wx-item-body">
                <b>{a.title}</b>
                <p>{a.detail}</p>
              </div>
              <div className="wx-item-actions">
                {a.suggest !== 'none' && a.itemIds[0] && a.suggest === 'indoor' && (
                  <button className="btn btn-sm" onClick={() => onFixItem(a.itemIds[0])}>
                    换成室内 <IconArrow size={10} />
                  </button>
                )}
                {a.itemIds[0] && (
                  <button className="btn btn-sm btn-ghost" onClick={() => onOpenItem(a.itemIds[0])}>
                    看这一站
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {alerts.length === 0 && (
        <div className="wx-clear">
          <span>
            {outOfRange
              ? `行程 ${tripDates[0]?.slice(5)} 开始，超出七天预报范围（预报只到 ${range}）。出发前 3 天再回来看这一条，会自动变成逐日提醒。`
              : '行程这几天没有需要调整的天气，按计划走就行。'}
          </span>
          <span className="wx-note">
            {outOfRange
              ? '不拿今天的天气去推断两周后 —— 那叫编。'
              : '降水概率按天气现象映射，不是数值预报；只在真抓到预报时给提醒。'}
          </span>
        </div>
      )}
    </div>
  );
}
