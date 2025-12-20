'use client';

import * as React from 'react';

import { Droplet, Globe, Palette, RotateCcw, Save, Settings as SettingsIcon, Type } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export const dynamic = 'force-dynamic';

type SettingsCategory = 'language' | 'theme' | 'font' | 'color' | 'other';

type SettingsMenuItemProps = {
  category: SettingsCategory;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
};

function SettingsMenuItem({ category, icon: Icon, label, active, onClick }: SettingsMenuItemProps) {
  return (
    <Button
      key={category}
      onClick={onClick}
      variant="ghost"
      className={`w-full px-4 py-3 justify-start rounded-lg transition-colors flex items-center gap-3 ${
        active ? 'bg-blue-100 text-blue-600 hover:bg-blue-100' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Button>
  );
}

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = React.useState<SettingsCategory>('language');
  const [hasChanges, setHasChanges] = React.useState(false);

  const [language, setLanguage] = React.useState<'ja' | 'en' | 'vi'>('ja');
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  const [font, setFont] = React.useState('Noto Sans JP');
  const [backgroundColor, setBackgroundColor] = React.useState('#ffffff');
  const [autoSave, setAutoSave] = React.useState(true);

  const updateSetting = (fn: () => void) => {
    fn();
    setHasChanges(true);
  };

  const handleSave = async () => {
    // TODO: integrate API (PUT /api/user/settings)
    setHasChanges(false);
    alert('設定を保存しました');
  };

  const handleReset = () => {
    if (!confirm('設定をリセットしてもよろしいですか？')) return;

    setLanguage('ja');
    setTheme('light');
    setFont('Noto Sans JP');
    setBackgroundColor('#ffffff');
    setAutoSave(true);
    setHasChanges(false);
  };

  const renderSettingsForm = () => {
    switch (activeCategory) {
      case 'language':
        return (
          <section>
            <h2 className="text-2xl mb-6 text-gray-900">Cài Đặt Ngôn Ngữ</h2>
            <RadioGroup
              value={language}
              onValueChange={(val) => updateSetting(() => setLanguage(val as any))}
              className="space-y-4"
            >
              {[
                { code: 'ja', label: 'Tiếng Nhật' },
                { code: 'en', label: 'English' },
                { code: 'vi', label: 'Tiếng Việt' },
              ].map((item) => (
                <div
                  key={item.code}
                  className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <RadioGroupItem value={item.code} id={`lang-${item.code}`} />
                  <Label htmlFor={`lang-${item.code}`} className="flex-1 cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </section>
        );

      case 'theme':
        return (
          <section>
            <h2 className="text-2xl mb-6 text-gray-900">Cài Đặt Chủ Đề</h2>
            <RadioGroup
              value={theme}
              onValueChange={(val) => updateSetting(() => setTheme(val as any))}
              className="space-y-4"
            >
              <div className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                <RadioGroupItem value="light" id="theme-light" />
                <Label htmlFor="theme-light" className="cursor-pointer">
                  Chế Độ Sáng
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                <RadioGroupItem value="dark" id="theme-dark" />
                <Label htmlFor="theme-dark" className="cursor-pointer">
                  Chế Độ Tối
                </Label>
              </div>
            </RadioGroup>
          </section>
        );

      case 'font':
        return (
          <section>
            <h2 className="text-2xl mb-6 text-gray-900">Cài Đặt Font</h2>
            <div>
              <Label className="block mb-3 text-gray-700">Font Mặc Định</Label>
              <Select value={font} onValueChange={(val) => updateSetting(() => setFont(val))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn font" />
                </SelectTrigger>
                <SelectContent>
                  {['Noto Sans JP', 'Yu Gothic', 'MS Gothic', 'Meiryo'].map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-3 text-sm text-gray-500" style={{ fontFamily: font }}>
                Xem Trước: ABC 123
              </p>
            </div>
          </section>
        );

      case 'color':
        return (
          <section>
            <h2 className="text-2xl mb-6 text-gray-900">Cài Đặt Màu Nền</h2>
            <div>
              <Label className="block mb-3 text-gray-700">Màu Nền Slide</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => updateSetting(() => setBackgroundColor(e.target.value))}
                  className="w-20 h-20 border border-gray-300 rounded-lg cursor-pointer p-1"
                />
                <Input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => updateSetting(() => setBackgroundColor(e.target.value))}
                  className="w-40"
                />
              </div>
            </div>
          </section>
        );

      case 'other':
        return (
          <section>
            <h2 className="text-2xl mb-6 text-gray-900">Cài Đặt Khác</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                <Label>Bật Tự Động Lưu</Label>
                <Switch checked={autoSave} onCheckedChange={(val) => updateSetting(() => setAutoSave(Boolean(val)))} />
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                <Label>Hiển Thị Thông Báo</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                <Label>Gửi Dữ Liệu Phân Tích</Label>
                <Switch defaultChecked />
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-6">
      <aside className="w-64">
        <Card className="p-4 border border-gray-200">
          <h3 className="text-sm mb-4 text-gray-700">Menu Danh Mục Cài Đặt</h3>
          <div className="space-y-1">
            <SettingsMenuItem
              category="language"
              icon={Globe}
              label="Ngôn Ngữ"
              active={activeCategory === 'language'}
              onClick={() => setActiveCategory('language')}
            />
            <SettingsMenuItem
              category="theme"
              icon={Palette}
              label="Chủ Đề"
              active={activeCategory === 'theme'}
              onClick={() => setActiveCategory('theme')}
            />
            <SettingsMenuItem
              category="font"
              icon={Type}
              label="Font"
              active={activeCategory === 'font'}
              onClick={() => setActiveCategory('font')}
            />
            <SettingsMenuItem
              category="color"
              icon={Droplet}
              label="Màu Nền"
              active={activeCategory === 'color'}
              onClick={() => setActiveCategory('color')}
            />
            <SettingsMenuItem
              category="other"
              icon={SettingsIcon}
              label="Khác"
              active={activeCategory === 'other'}
              onClick={() => setActiveCategory('other')}
            />
          </div>
        </Card>
      </aside>

      <main className="flex-1">
        <Card className="p-8 border border-gray-200">
          <div className="flex justify-end gap-3 mb-6">
            <Button onClick={handleReset} variant="outline" className="border-gray-300 hover:bg-gray-100">
              <RotateCcw className="w-4 h-4 mr-2" />
              Đặt Lại
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            >
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>

          {renderSettingsForm()}
        </Card>
      </main>
    </div>
  );
}
