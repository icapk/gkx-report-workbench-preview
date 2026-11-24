/* A completed local walkthrough captured from the workbench's normal clarification flow. */
(() => {
  'use strict';
  const example = {
  "title": "深圳低空物流示范场景研究",
  "prompt": "研究主题：深圳低空物流示范场景研究\n研究目标：比较医疗急送与园区配送的示范条件及优先次序\n研究范围：深圳\n目标读者：深圳市产业主管部门，用于确定示范项目的优先次序",
  "folderId": "low-altitude",
  "project": "低空经济战略研究",
  "type": "战略分析报告",
  "model": "GLM 5.2",
  "template": "不使用模板",
  "updatedAt": 1795445198527,
  "id": "sample-low-altitude-logistics",
  "runId": "a4d50684-bc07-434f-b32b-88ba7dd6abaa",
  "startedAt": 1795445187352,
  "fields": [
    {
      "id": "F01",
      "label": "研究主题",
      "name": "战略研究主题与对象",
      "value": "深圳低空物流示范场景研究",
      "judge": "VALID",
      "decision": "SKIP",
      "origin": "input",
      "missing": "",
      "candidates": []
    },
    {
      "id": "F02",
      "label": "研究目标",
      "name": "核心研究目标与关键问题",
      "value": "比较医疗急送与园区配送的示范条件及优先次序",
      "judge": "VALID",
      "decision": "SKIP",
      "origin": "input",
      "missing": "",
      "candidates": []
    },
    {
      "id": "F03",
      "label": "研究范围",
      "name": "研究范围",
      "value": "深圳；未来三年",
      "judge": "VALID",
      "decision": "SKIP",
      "origin": "answer",
      "missing": "",
      "candidates": []
    },
    {
      "id": "F04",
      "label": "目标读者",
      "name": "目标读者与决策场景",
      "value": "深圳市产业主管部门，用于确定示范项目的优先次序",
      "judge": "VALID",
      "decision": "SKIP",
      "origin": "input",
      "missing": "",
      "candidates": []
    }
  ],
  "history": [
    {
      "round": 1,
      "questions": [
        {
          "id": "F03",
          "title": "研究希望关注哪个时间周期？",
          "description": "已保留深圳的地域信息，只补充时间范围。",
          "options": [
            "未来一年",
            "未来三年",
            "未来五年"
          ],
          "partial": true
        }
      ],
      "answers": {
        "F03": {
          "option": "未来三年",
          "text": "",
          "skipped": false,
          "customOpen": false
        }
      }
    }
  ],
  "answers": {
    "F03": {
      "option": "",
      "text": "深圳；未来三年",
      "skipped": false,
      "customOpen": false
    }
  }
};
  function addTo(workspace) {
    if (workspace.reports.some(report=>report.id===example.id)) return workspace;
    const {fields, history, answers, runId, startedAt, ...info}=example;
    const folders=workspace.folders.slice();
    let project=folders.find(item=>item.id===info.folderId);
    if (!project) {
      project={id:info.folderId,name:info.project};
      folders.push(project);
    }
    const definition={prompt:info.prompt,consent:true,attachments:[],fields:fields.map(({id,name,value,origin})=>({id,name,value,origin,unresolved:null}))};
    const state={phase:'complete',material:{prompt:info.prompt,attachments:[],answers,edits:{}},
      definition,fields,history,questions:[],round:history.length,index:0,answers:{},error:'',ending:false,
      processReason:'round',editId:null,editText:'',executionProgress:100,extractionCount:8};
    const report={...info,project:project.name,attachments:[],knowledgeFiles:[],skills:[],skillSnapshots:[],
      progress:100,generated:true,session:{runId,startedAt,state,edits:[],historyBefore:[]}};
    report.draft={id:report.id,title:report.title,prompt:report.prompt,type:report.type,project:project.name,
      model:report.model,template:report.template,skills:[],skillSnapshots:[],taskDefinition:definition};
    const content=window.buildSessionReportContent({report,draft:report.draft,definition,project:project.name,phase:'complete'});
    report.publishedReport={...content,type:report.type,revision:runId,date:info.updatedAt,sourceDetails:[],
      history:window.sessionReports.historyFor(report,state)};
    report.title=info.title+"（示例）";
    return {...workspace,folders,reports:[report,...workspace.reports]};
  }
  window.workbenchExample={id:example.id,addTo};
})();
