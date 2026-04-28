const xlsx = require('xlsx');

class ExcelAutomation {
    constructor(db) {
        this.db = db;
    }

    async processLeads(filePath) {
        console.log('Processing Excel Data:', filePath);
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const segmentedLeads = data.map(row => {
            // Intelligent categorization logic
            const status = this.categorizeLead(row);
            return {
                name: row.Name || row.name || 'Unknown',
                email: row.Email || row.email,
                company: row.Company || row.company || 'N/A',
                region: row.Region || row.region || 'Unknown',
                status: status
            };
        });

        for (const lead of segmentedLeads) {
            await this.db.run(
                'INSERT INTO leads (name, email, company, region, status) VALUES (?, ?, ?, ?, ?)',
                [lead.name, lead.email, lead.company, lead.region, lead.status]
            );
        }

        return segmentedLeads.length;
    }

    categorizeLead(row) {
        // Simple logic: if email is corporate, mark as high priority
        const email = row.Email || row.email || '';
        if (email.includes('.com') && !email.includes('gmail') && !email.includes('outlook')) {
            return 'high_priority';
        }
        return 'new';
    }
}

module.exports = ExcelAutomation;
