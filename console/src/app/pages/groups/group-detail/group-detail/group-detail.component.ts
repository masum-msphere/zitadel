import { MediaMatcher } from '@angular/cdk/layout';
import { Location } from '@angular/common';
import { PageEvent } from '@angular/material/paginator';
import { Component, EventEmitter, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs/operators';
import { WarnDialogComponent } from 'src/app/modules/warn-dialog/warn-dialog.component';
import { LoginPolicy } from 'src/app/proto/generated/zitadel/policy_pb';
import { Group, GroupState } from 'src/app/proto/generated/zitadel/group_pb';
import { User } from 'src/app/proto/generated/zitadel/user_pb';
import { Breadcrumb, BreadcrumbService, BreadcrumbType } from 'src/app/services/breadcrumb.service';
import { ManagementService } from 'src/app/services/mgmt.service';
import { ToastService } from 'src/app/services/toast.service';
import { LanguagesService } from '../../../../services/languages.service';
import { NameDialogComponent } from 'src/app/modules/name-dialog/name-dialog.component';

@Component({
  selector: 'cnsl-group-detail',
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.scss'],
})
export class GroupDetailComponent implements OnInit {
  public group!: Group.AsObject;
  public groupId: string = '';

  public loading: boolean = true;

  public GroupState: any = GroupState;
  public copied: string = '';

  public changePage: EventEmitter<void> = new EventEmitter();

  public error: string = '';
  public loginPolicy?: LoginPolicy.AsObject;

  constructor(
    public translate: TranslateService,
    private route: ActivatedRoute,
    private toast: ToastService,
    public mgmtGroupService: ManagementService,
    private _location: Location,
    private dialog: MatDialog,
    private router: Router,
    activatedRoute: ActivatedRoute,
    private mediaMatcher: MediaMatcher,
    public langSvc: LanguagesService,
    breadcrumbService: BreadcrumbService,
  ) {
    breadcrumbService.setBreadcrumb([
      new Breadcrumb({
        type: BreadcrumbType.ORG,
        routerLink: ['/org'],
      }),
    ]);

    const mediaq: string = '(max-width: 500px)';
  }


  refreshGroup(): void {
    this.changePage.emit();
    this.route.params.pipe(take(1)).subscribe((params) => {
      this.loading = true;
      const { id } = params;
      this.mgmtGroupService
        .getGroupByID(id)
        .then((resp) => {
          this.loading = false;
          if (resp.group) {
            this.group = resp.group;
          }
        })
        .catch((err) => {
          this.error = err.message ?? '';
          this.loading = false;
          this.toast.showError(err);
        });
    });
  }

  public ngOnInit(): void {
    const groupId = this.route.snapshot.paramMap.get('id');
    this.refreshGroup();

    this.mgmtGroupService.getLoginPolicy().then((policy) => {
      if (policy.policy) {
        this.loginPolicy = policy.policy;
      }
    });
  }

  public changeState(newState: GroupState): void {
    if (newState === GroupState.GROUP_STATE_ACTIVE) {
      this.mgmtGroupService
        .reactivateGroup(this.group.id)
        .then(() => {
          this.toast.showInfo('GROUP.TOAST.REACTIVATED', true);
          this.group.state = newState;
        })
        .catch((error) => {
          this.toast.showError(error);
        });
    } else if (newState === GroupState.GROUP_STATE_INACTIVE) {
      this.mgmtGroupService
        .deactivateGroup(this.group.id)
        .then(() => {
          this.toast.showInfo('GROUP.TOAST.DEACTIVATED', true);
          this.group.state = newState;
        })
        .catch((error) => {
          this.toast.showError(error);
        });
    }
  }

  public navigateBack(): void {
    this._location.back();
  }

  public deleteGroup(): void {
    const dialogRef = this.dialog.open(WarnDialogComponent, {
      data: {
        confirmKey: 'ACTIONS.DELETE',
        cancelKey: 'ACTIONS.CANCEL',
        titleKey: 'GROUP.DIALOG.DELETE_TITLE',
        descriptionKey: 'GROUP.DIALOG.DELETE_DESCRIPTION',
      },
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((resp) => {
      if (resp) {
        this.mgmtGroupService
          .removeGroup(this.group.id)
          .then(() => {
            const params: Params = {
              deferredReload: true,
            };
            this.router.navigate(['/groups'], { queryParams: params });
            this.toast.showInfo('GROUP.TOAST.DELETED', true);
          })
          .catch((error) => {
            this.toast.showError(error);
          });
      }
    });
  }

  public openNameDialog(): void {
    const dialogRef = this.dialog.open(NameDialogComponent, {
      data: {
        name: this.group?.name,
        titleKey: 'APP.NAMEDIALOG.TITLE',
        descKey: 'APP.NAMEDIALOG.DESCRIPTION',
        labelKey: 'APP.NAMEDIALOG.NAME',
      },
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((name) => {
      if (name) {
        this.group!.name = name;
        this.saveGroup();
      }
    });
  }

  public saveGroup(): void {
    if (this.group) {
      this.mgmtGroupService
        .updateGroup(this.group.id, this.group.name)
        .then(() => {
          this.toast.showInfo('APP.TOAST.UPDATED', true);
        })
        .catch((error) => {
          this.toast.showError(error);
        });
    }
  }
}
