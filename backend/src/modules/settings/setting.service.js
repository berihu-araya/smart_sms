class SettingService {
  constructor(repository) {
    this.repository = repository;
  }

  async getSettings() {
    let settings = await this.repository.getSettings();
    if (!settings) {
      settings = await this.repository.updateSettings({});
    }
    return settings;
  }

  async updateSettings(payload) {
    return await this.repository.updateSettings(payload);
  }
}

module.exports = SettingService;
