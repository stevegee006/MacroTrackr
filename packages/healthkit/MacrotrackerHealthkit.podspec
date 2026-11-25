require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'MacroTrackerHealthKit'
  s.version = package['version']
  s.summary = package['description']
  s.license = 'MIT'
  s.homepage = 'https://github.com/stevegee006/MacroTrackr'
  s.author = { 'MacroTrackr' => 'dev@macrotrackr.local' }
  s.source = { :git => 'https://github.com/stevegee006/MacroTrackr.git', :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/*.{swift,h,m}'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
  s.frameworks = 'HealthKit'
end
