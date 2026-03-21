/**
 * data-import.js - 연자/회사 데이터 업로드 모듈 (상용화 버전)
 * 
 * 기능:
 * - 연자 데이터 Excel 업로드
 * - 회사 데이터 Excel 업로드
 * - 데이터 미리보기 및 검증
 * - 기존 데이터와 병합/덮어쓰기 선택
 */

(function() {
    'use strict';

    // ============================================
    // 연자 데이터 업로드
    // ============================================
    
    /**
     * 연자 업로드 모달 열기
     */
    window.openSpeakerUploadModal = function() {
        if (!checkEditPermission()) return;
        
        document.getElementById('speakerUploadModal').classList.add('active');
        document.getElementById('speakerUploadPreview').innerHTML = '';
        document.getElementById('speakerUploadFile').value = '';
        document.getElementById('speakerUploadMode').value = 'merge';
    };
    
    /**
     * 연자 업로드 모달 닫기
     */
    window.closeSpeakerUploadModal = function() {
        document.getElementById('speakerUploadModal').classList.remove('active');
    };
    
    /**
     * 연자 Excel 파일 처리
     */
    window.handleSpeakerFileUpload = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                if (jsonData.length === 0) {
                    Toast.warning('데이터가 없습니다.');
                    return;
                }
                
                // 데이터 파싱 및 미리보기
                const speakers = parseSpeakerData(jsonData);
                showSpeakerPreview(speakers);
                
            } catch (error) {
                console.error('파일 파싱 오류:', error);
                Toast.error('파일을 읽을 수 없습니다: ' + error.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };
    
    /**
     * 연자 데이터 파싱
     * Excel 컬럼명: name, nameEn, affiliation, affiliationEn, isASLS, expertiseTags
     */
    function parseSpeakerData(rawData) {
        return rawData.map((row, index) => {
            // 다양한 컬럼명 지원
            const name = row['name'] || row['이름'] || row['연자명'] || row['Name'] || '';
            const nameEn = row['nameEn'] || row['영문이름'] || row['English Name'] || row['Name (English)'] || '';
            const affiliation = row['affiliation'] || row['소속'] || row['Affiliation'] || row['병원'] || '';
            const affiliationEn = row['affiliationEn'] || row['영문소속'] || row['Affiliation (English)'] || '';
            const isASLS = row['isASLS'] || row['ASLS'] || row['ASLS회원'] || '';
            const expertiseTags = row['expertiseTags'] || row['전문분야'] || row['Expertise'] || '';
            
            return {
                name: name.toString().trim(),
                nameEn: nameEn.toString().trim(),
                affiliation: affiliation.toString().trim(),
                affiliationEn: affiliationEn.toString().trim(),
                isASLS: isASLS === true || isASLS === 'Y' || isASLS === 'O' || isASLS === '1' || isASLS === 1,
                expertiseTags: expertiseTags ? expertiseTags.toString().split(',').map(t => t.trim()).filter(t => t) : [],
                _rowIndex: index + 2 // Excel 행 번호 (헤더 제외)
            };
        }).filter(s => s.name); // 이름이 있는 항목만
    }
    
    /**
     * 연자 미리보기 표시
     */
    function showSpeakerPreview(speakers) {
        const preview = document.getElementById('speakerUploadPreview');
        
        if (speakers.length === 0) {
            preview.innerHTML = '<p class="warning">유효한 연자 데이터가 없습니다.</p>';
            return;
        }
        
        // 현재 데이터와 비교
        const existingNames = new Set(AppState.speakers.map(s => s.name));
        let newCount = 0;
        let updateCount = 0;
        
        speakers.forEach(s => {
            if (existingNames.has(s.name)) {
                updateCount++;
            } else {
                newCount++;
            }
        });
        
        let html = `
            <div class="upload-summary">
                <p>📊 <strong>총 ${speakers.length}명</strong> 발견</p>
                <p>🆕 새 연자: <strong>${newCount}명</strong></p>
                <p>🔄 기존 연자 업데이트: <strong>${updateCount}명</strong></p>
            </div>
            <div class="upload-table-wrapper">
                <table class="upload-preview-table">
                    <thead>
                        <tr>
                            <th>상태</th>
                            <th>이름</th>
                            <th>영문</th>
                            <th>소속</th>
                            <th>ASLS</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        speakers.slice(0, 50).forEach(s => {
            const isNew = !existingNames.has(s.name);
            html += `
                <tr class="${isNew ? 'new-row' : 'update-row'}">
                    <td>${isNew ? '🆕' : '🔄'}</td>
                    <td>${s.name}</td>
                    <td>${s.nameEn || '-'}</td>
                    <td>${s.affiliation || '-'}</td>
                    <td>${s.isASLS ? '✅' : '-'}</td>
                </tr>
            `;
        });
        
        if (speakers.length > 50) {
            html += `<tr><td colspan="5" style="text-align:center;">... 외 ${speakers.length - 50}명</td></tr>`;
        }
        
        html += '</tbody></table></div>';
        
        preview.innerHTML = html;
        
        // 저장 버튼 활성화
        document.getElementById('speakerUploadSaveBtn').disabled = false;
        document.getElementById('speakerUploadSaveBtn').onclick = () => saveSpeakerUpload(speakers);
    }
    
    /**
     * 연자 데이터 저장
     */
    async function saveSpeakerUpload(speakers) {
        const mode = document.getElementById('speakerUploadMode').value;
        
        try {
            let finalSpeakers;
            
            if (mode === 'replace') {
                // 덮어쓰기: 새 데이터로 교체
                finalSpeakers = speakers;
            } else {
                // 병합: 기존 데이터 + 새 데이터
                const existingMap = new Map(AppState.speakers.map(s => [s.name, s]));
                
                speakers.forEach(s => {
                    if (existingMap.has(s.name)) {
                        // 기존 연자 정보 업데이트 (새 정보가 있는 필드만)
                        const existing = existingMap.get(s.name);
                        if (s.nameEn) existing.nameEn = s.nameEn;
                        if (s.affiliation) existing.affiliation = s.affiliation;
                        if (s.affiliationEn) existing.affiliationEn = s.affiliationEn;
                        if (s.isASLS !== undefined) existing.isASLS = s.isASLS;
                        if (s.expertiseTags?.length > 0) existing.expertiseTags = s.expertiseTags;
                    } else {
                        // 새 연자 추가
                        existingMap.set(s.name, s);
                    }
                });
                
                finalSpeakers = Array.from(existingMap.values());
            }
            
            // Firebase에 저장
            const speakersRef = eventRef('data/speakers');
            if (speakersRef) {
                await speakersRef.set(finalSpeakers);
            }
            
            // 로컬 상태 업데이트
            AppState.speakers = finalSpeakers;
            
            Toast.success(`연자 ${finalSpeakers.length}명 저장 완료`);
            closeSpeakerUploadModal();
            
            // UI 업데이트
            if (typeof updateSpeakerList === 'function') updateSpeakerList();
            if (typeof updateLectureList === 'function') updateLectureList();
            
        } catch (error) {
            console.error('연자 저장 실패:', error);
            Toast.error('저장 실패: ' + error.message);
        }
    }
    
    // ============================================
    // 회사 데이터 업로드
    // ============================================
    
    /**
     * 회사 업로드 모달 열기
     */
    window.openCompanyUploadModal = function() {
        if (!checkEditPermission()) return;
        
        document.getElementById('companyUploadModal').classList.add('active');
        document.getElementById('companyUploadPreview').innerHTML = '';
        document.getElementById('companyUploadFile').value = '';
        document.getElementById('companyUploadMode').value = 'merge';
    };
    
    /**
     * 회사 업로드 모달 닫기
     */
    window.closeCompanyUploadModal = function() {
        document.getElementById('companyUploadModal').classList.remove('active');
    };
    
    /**
     * 회사 Excel 파일 처리
     */
    window.handleCompanyFileUpload = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                if (jsonData.length === 0) {
                    Toast.warning('데이터가 없습니다.');
                    return;
                }
                
                // 데이터 파싱 및 미리보기
                const companies = parseCompanyData(jsonData);
                showCompanyPreview(companies);
                
            } catch (error) {
                console.error('파일 파싱 오류:', error);
                Toast.error('파일을 읽을 수 없습니다: ' + error.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };
    
    /**
     * 회사 데이터 파싱
     * Excel 컬럼명: name, nameEn, contact, email, boothType, boothCount
     */
    function parseCompanyData(rawData) {
        return rawData.map((row, index) => {
            // 다양한 컬럼명 지원
            const name = row['name'] || row['업체명'] || row['회사명'] || row['Company'] || '';
            const nameEn = row['nameEn'] || row['영문명'] || row['English Name'] || '';
            const contact = row['contact'] || row['담당자'] || row['Contact'] || '';
            const email = row['email'] || row['이메일'] || row['Email'] || '';
            const phone = row['phone'] || row['연락처'] || row['Phone'] || '';
            const boothType = row['boothType'] || row['부스형태'] || row['Booth Type'] || '';
            const boothCount = row['boothCount'] || row['부스수'] || row['Booth Count'] || 1;
            
            return {
                name: name.toString().trim(),
                nameEn: nameEn.toString().trim(),
                contact: contact.toString().trim(),
                email: email.toString().trim(),
                phone: phone.toString().trim(),
                boothType: boothType.toString().trim(),
                boothCount: parseInt(boothCount) || 1,
                _rowIndex: index + 2
            };
        }).filter(c => c.name);
    }
    
    /**
     * 회사 미리보기 표시
     */
    function showCompanyPreview(companies) {
        const preview = document.getElementById('companyUploadPreview');
        
        if (companies.length === 0) {
            preview.innerHTML = '<p class="warning">유효한 회사 데이터가 없습니다.</p>';
            return;
        }
        
        // 현재 데이터와 비교
        const existingNames = new Set(AppState.companies.map(c => c.name || c));
        let newCount = 0;
        let updateCount = 0;
        
        companies.forEach(c => {
            if (existingNames.has(c.name)) {
                updateCount++;
            } else {
                newCount++;
            }
        });
        
        let html = `
            <div class="upload-summary">
                <p>📊 <strong>총 ${companies.length}개 업체</strong> 발견</p>
                <p>🆕 새 업체: <strong>${newCount}개</strong></p>
                <p>🔄 기존 업체 업데이트: <strong>${updateCount}개</strong></p>
            </div>
            <div class="upload-table-wrapper">
                <table class="upload-preview-table">
                    <thead>
                        <tr>
                            <th>상태</th>
                            <th>업체명</th>
                            <th>영문</th>
                            <th>담당자</th>
                            <th>부스</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        companies.slice(0, 50).forEach(c => {
            const isNew = !existingNames.has(c.name);
            html += `
                <tr class="${isNew ? 'new-row' : 'update-row'}">
                    <td>${isNew ? '🆕' : '🔄'}</td>
                    <td>${c.name}</td>
                    <td>${c.nameEn || '-'}</td>
                    <td>${c.contact || '-'}</td>
                    <td>${c.boothType ? `${c.boothType} (${c.boothCount})` : '-'}</td>
                </tr>
            `;
        });
        
        if (companies.length > 50) {
            html += `<tr><td colspan="5" style="text-align:center;">... 외 ${companies.length - 50}개</td></tr>`;
        }
        
        html += '</tbody></table></div>';
        
        preview.innerHTML = html;
        
        // 저장 버튼 활성화
        document.getElementById('companyUploadSaveBtn').disabled = false;
        document.getElementById('companyUploadSaveBtn').onclick = () => saveCompanyUpload(companies);
    }
    
    /**
     * 회사 데이터 저장
     */
    async function saveCompanyUpload(companies) {
        const mode = document.getElementById('companyUploadMode').value;
        
        try {
            let finalCompanies;
            
            if (mode === 'replace') {
                finalCompanies = companies;
            } else {
                // 병합
                const existingMap = new Map();
                AppState.companies.forEach(c => {
                    const name = typeof c === 'string' ? c : c.name;
                    existingMap.set(name, typeof c === 'string' ? { name: c } : c);
                });
                
                companies.forEach(c => {
                    if (existingMap.has(c.name)) {
                        const existing = existingMap.get(c.name);
                        Object.assign(existing, c);
                    } else {
                        existingMap.set(c.name, c);
                    }
                });
                
                finalCompanies = Array.from(existingMap.values());
            }
            
            // Firebase에 저장
            const companiesRef = eventRef('data/companies');
            if (companiesRef) {
                await companiesRef.set(finalCompanies);
            }
            
            // 로컬 상태 업데이트
            AppState.companies = finalCompanies;
            
            Toast.success(`업체 ${finalCompanies.length}개 저장 완료`);
            closeCompanyUploadModal();
            
            // UI 업데이트
            if (typeof populateCompanyDropdowns === 'function') populateCompanyDropdowns();
            
        } catch (error) {
            console.error('회사 저장 실패:', error);
            Toast.error('저장 실패: ' + error.message);
        }
    }
    
    // ============================================
    // 데이터 내보내기
    // ============================================
    
    /**
     * 연자 데이터 Excel 내보내기
     */
    window.exportSpeakersToExcel = function() {
        if (AppState.speakers.length === 0) {
            Toast.warning('내보낼 연자 데이터가 없습니다.');
            return;
        }
        
        const data = AppState.speakers.map(s => ({
            'name': s.name || '',
            'nameEn': s.nameEn || '',
            'affiliation': s.affiliation || '',
            'affiliationEn': s.affiliationEn || '',
            'isASLS': s.isASLS ? 'Y' : '',
            'expertiseTags': (s.expertiseTags || []).join(', ')
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Speakers');
        
        const filename = `speakers_${AppConfig.currentEventName || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        Toast.success('연자 데이터 내보내기 완료');
    };
    
    /**
     * 회사 데이터 Excel 내보내기
     */
    window.exportCompaniesToExcel = function() {
        if (AppState.companies.length === 0) {
            Toast.warning('내보낼 업체 데이터가 없습니다.');
            return;
        }
        
        const data = AppState.companies.map(c => {
            if (typeof c === 'string') {
                return { 'name': c };
            }
            return {
                'name': c.name || '',
                'nameEn': c.nameEn || '',
                'contact': c.contact || '',
                'email': c.email || '',
                'phone': c.phone || '',
                'boothType': c.boothType || '',
                'boothCount': c.boothCount || ''
            };
        });
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Companies');
        
        const filename = `companies_${AppConfig.currentEventName || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        Toast.success('업체 데이터 내보내기 완료');
    };

})();

console.log('✅ data-import.js 로드 완료');
