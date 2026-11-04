const { withDangerousMod, withMainApplication, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
module.exports = config => {
    config = withMainApplication(config, mod => {
        const contents = mod.modResults.contents;
        if (!contents.includes('add(RouteMarkerPackage())')) {
            const anchor = 'PackageList(this).packages.apply {';
            if (!contents.includes(anchor)) throw new Error('Cannot register the native map package in MainApplication');
            mod.modResults.contents = contents.replace(anchor, anchor + '\n              add(RouteMarkerPackage())');
        }
        return mod;
    });
    config = withAppBuildGradle(config, mod => {
        if (!mod.modResults.contents.includes('// Metro native map dependencies')) {
            mod.modResults.contents = mod.modResults.contents.replace('dependencies {',
                'dependencies {\n    // Metro native map dependencies\n    implementation "com.google.android.gms:play-services-maps:19.2.0"\n    testImplementation "junit:junit:4.13.2"');
        }
        mod.modResults.contents = mod.modResults.contents.replace('play-services-maps:18.2.0', 'play-services-maps:19.2.0');
        return mod;
    });
    return withDangerousMod(config, ['android', mod => {
        const packageName = mod.android.package;
        const writeSources = (folder, sourceSet) => {
            const target = path.join(mod.modRequest.platformProjectRoot, 'app/src', sourceSet, 'java', ...packageName.split('.'));
            fs.mkdirSync(target, { recursive: true });
            for (const file of fs.readdirSync(path.join(__dirname, folder)).filter(name => name.endsWith('.kt'))) {
                const template = fs.readFileSync(path.join(__dirname, folder, file), 'utf8');
                fs.writeFileSync(path.join(target, file), template.replaceAll('__PACKAGE__', packageName));
            }
        };
        writeSources('native', 'main');
        writeSources('native-tests', 'test');
        const resources = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/drawable-nodpi');
        fs.mkdirSync(resources, { recursive: true });
        fs.copyFileSync(path.join(mod.modRequest.projectRoot, 'assets/images/nav-puck.png'), path.join(resources, 'metro_nav_puck.png'));
        return mod;
    }]);
};
