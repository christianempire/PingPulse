export const IPC = {
  getSettings: 'pp:getSettings',
  setSettings: 'pp:setSettings',
  setMonitoring: 'pp:setMonitoring',
  setCompact: 'pp:setCompact',
  showMain: 'pp:showMain',
  getThresholds: 'pp:getThresholds',
  isPackaged: 'pp:isPackaged',
  windowMinimize: 'pp:window:minimize',
  windowMaximizeToggle: 'pp:window:maximize-toggle',
  windowClose: 'pp:window:close',
  windowIsMaximized: 'pp:window:is-maximized',
  sample: 'pp:sample',
  settings: 'pp:settings',
  thresholds: 'pp:thresholds',
  maximized: 'pp:window:maximized'
} as const
