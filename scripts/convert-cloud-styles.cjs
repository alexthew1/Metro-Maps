const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const schemaArg = process.argv.indexOf('--schema');
if (schemaArg < 0 || !process.argv[schemaArg + 1]) throw new Error('Pass --schema with the downloaded https://developers.google.com/static/maps/cbms-json-schema.json');
const schema = JSON.parse(fs.readFileSync(process.argv[schemaArg + 1], 'utf8'));
const featureSchemas = new Map(schema.properties.styles.items.oneOf.map(value => [value.properties.id.const, value]));
const moduleOutput = ts.transpileModule(fs.readFileSync(path.join(root, 'constants/MapStyles.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const source = {};
new Function('exports', moduleOutput)(source);

function convert(legacy, variant) {
    const styles = new Map();
    const coverage = [];
    let activeAudit;
    const rule = id => { if (!styles.has(id)) styles.set(id, { id }); return styles.get(id); };
    const set = (ids, element, props) => {
        for (const id of ids) {
            const allowed = featureSchemas.get(id)?.properties[element]?.properties;
            if (!featureSchemas.has(id)) throw new Error('Unknown cloud feature: ' + id);
            for (const [key, value] of Object.entries(props)) {
                if (allowed?.[key]) (rule(id)[element] ||= {})[key] = value;
                else if (activeAudit) activeAudit.notes.push('Cloud schema does not expose ' + element + '.' + key + ' for ' + id + '; related footprints retain the general building/POI palette.');
            }
        }
    };
    const roots = ['natural', 'infrastructure', 'pointOfInterest', 'political'];
    const mapping = {
        administrative: ['political.border', 'political.landParcel'],
        'administrative.land_parcel': ['political.landParcel'],
        'administrative.neighborhood': ['political.neighborhood'],
        'administrative.locality': ['political.city'],
        landscape: ['natural.land', 'infrastructure.urbanArea'],
        'landscape.man_made': ['infrastructure.urbanArea'],
        'landscape.natural': ['natural.land'],
        'landscape.man_made.building': ['infrastructure.building'],
        poi: ['pointOfInterest'],
        'poi.business': ['infrastructure.building.commercial', 'pointOfInterest.foodAndDrink', 'pointOfInterest.retail', 'pointOfInterest.service', 'pointOfInterest.lodging'],
        'poi.government': ['pointOfInterest.other.government'],
        'poi.attraction': ['pointOfInterest.entertainment.touristAttraction', 'pointOfInterest.landmark'],
        'poi.school': ['pointOfInterest.other.school'],
        'poi.medical': ['pointOfInterest.emergency.hospital', 'pointOfInterest.emergency.pharmacy'],
        'poi.park': ['pointOfInterest.recreation.park'],
        transit: ['infrastructure.transitStation', 'pointOfInterest.transit'],
        'transit.line': ['infrastructure.railwayTrack'],
        'transit.station': ['infrastructure.transitStation'],
        road: ['infrastructure.roadNetwork'],
        'road.highway': ['infrastructure.roadNetwork.road.highway'],
        'road.arterial': ['infrastructure.roadNetwork.road.arterial'],
        'road.local': ['infrastructure.roadNetwork.road.local', 'infrastructure.roadNetwork.road.noOutlet'],
        water: ['natural.water'],
    };
    const geometryStrokes = id => !!featureSchemas.get(id)?.properties.geometry?.properties.strokeColor;
    let backgroundColor;
    for (const [index, entry] of legacy.entries()) {
        const feature = entry.featureType || 'all';
        const element = entry.elementType || 'all';
        const values = Object.assign({}, ...entry.stylers);
        const audit = { sourceRule: index + 1, feature, element, values, cloudFeatures: [], notes: [] };
        coverage.push(audit);
        activeAudit = audit;
        if (feature === 'road.highway.controlled_access') {
            audit.notes.push('No controlled-access highway subtype in the cloud schema. The parent highway palette is retained; the separate subtype override cannot be expressed.');
            continue;
        }
        if (feature === 'transit.station' && element.startsWith('geometry')) {
            audit.cloudFeatures = ['infrastructure.transitStation'];
            audit.notes.push('Cloud transit-station features expose labels, not separately styleable station geometry. Building footprints inherit the building palette.');
            continue;
        }
        const ids = feature === 'all' ? roots : mapping[feature];
        if (!ids) throw new Error('Unmapped legacy feature: ' + feature);
        audit.cloudFeatures = ids;
        if (feature === 'poi.business') audit.notes.push('Business category expands to commercial buildings, food/drink, retail, services and lodging.');
        if (feature === 'poi.medical') audit.notes.push('Medical maps to the available hospital and pharmacy categories.');
        if (element.startsWith('labels.text.')) {
            const field = element.endsWith('fill') ? 'textFillColor' : 'textStrokeColor';
            if (values.color) set(ids, 'label', { [field]: values.color });
            if (values.weight !== undefined) audit.notes.push('The downloadable cloud schema does not expose text stroke width; text stroke color is preserved.');
        } else if (element === 'labels.icon') {
            if (values.color) set(ids, 'label', { pinFillColor: values.color });
            if (values.visibility) set(ids, 'label', { visible: values.visibility !== 'off' });
            audit.notes.push('Cloud label visibility controls the icon and text together.');
        } else if (element.startsWith('geometry')) {
            const fill = element === 'geometry' || element.endsWith('.fill');
            const stroke = element === 'geometry' || element.endsWith('.stroke');
            if (feature === 'all' && values.color) backgroundColor = values.color;
            for (const id of ids) {
                if (values.color && fill) set([id], 'geometry', { fillColor: values.color });
                if (values.color && stroke) {
                    if (id === 'political.border') set([id], 'geometry', { color: values.color });
                    else if (geometryStrokes(id)) set([id], 'geometry', { strokeColor: values.color });
                    else if (element.endsWith('.stroke')) audit.notes.push('No polygon stroke control for ' + id + '; related building outlines are retained in infrastructure.building.');
                }
                if (values.weight !== undefined && geometryStrokes(id)) set([id], 'geometry', { strokeWidth: values.weight });
                if (values.visibility) set([id], 'geometry', { visible: values.visibility !== 'off' });
            }
            if (feature === 'administrative') audit.notes.push('Boundary color maps to political.border; land-parcel color and width are retained. Country/state boundary widths are not exposed.');
        } else throw new Error('Unmapped legacy element: ' + element);
    }
    activeAudit = null;
    // An explicit base avoids the cloud variant's default background leaking into unclassified areas.
    set(['natural.base'], 'geometry', { fillColor: backgroundColor });
    // Keep the requested modern blue pins, white outlines and white category glyphs.
    set(['pointOfInterest'], 'label', { pinOutlineColor: '#ffffff', pinGlyphColor: '#ffffff' });
    const result = { variant, backgroundColor, styles: [...styles.values()] };
    return { result, coverage };
}
const output = path.join(root, 'assets/map-styles');
fs.mkdirSync(output, { recursive: true });
const report = {};
for (const [variant, legacy] of [['light', source.LIGHT_MAP_STYLE], ['dark', source.DARK_MAP_STYLE]]) {
    const { result, coverage } = convert(legacy, variant);
    fs.writeFileSync(path.join(output, 'metro-' + variant + '.cloud.json'), JSON.stringify(result, null, 2) + '\n');
    report[variant] = { legacyRules: legacy.length, cloudRules: result.styles.length, coverage };
    console.log(variant + ': accounted for ' + legacy.length + ' legacy rules; generated ' + result.styles.length + ' cloud rules');
}
fs.writeFileSync(path.join(output, 'conversion-report.json'), JSON.stringify(report, null, 2) + '\n');
