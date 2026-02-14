using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.CustomControls;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Text;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CircuitEditor.Components
{
    public sealed partial class InductorParametersControl : UserControl
    {
        public Inductor SerializableInductor { get; }
        private string oldElementName;

        private int SelectedInductorModel { get { return SerializableInductor.InductorModel; } }

        public InductorParametersControl()
        {
            this.InitializeComponent();
           
        }

        public InductorParametersControl(Inductor inductor)
        {
         
            this.InitializeComponent();

            SerializableInductor = inductor;
            
            inductor.PropertyChanged += handleChangeOfControls;

            handleChangeOfControls(null, null);
            
        }

        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializableInductor.PropertyChanged -= handleChangeOfControls;

            BoxCp.Value = SerializableInductor.Cp;
            BoxRs.Value = SerializableInductor.Rs;
            BoxFo.Value = SerializableInductor.Fo;
            BoxQ.Value = SerializableInductor.Q;
            BoxEw.Value = SerializableInductor.Ew;

            cmbInductorModel.SelectionChanged -= modelInductorChanged;
            cmbInductorModel.SelectedIndex = SerializableInductor.InductorModel;
            cmbInductorModel.SelectionChanged += modelInductorChanged;

            ComponentValueBox.ValueChanged -= InductorValueChanged;
            ComponentValueBox.ComponentValue = SerializableInductor.InductorValue;
            ComponentValueBox.ValueChanged += InductorValueChanged;

            ComponentValueBox.PrecisionChanged -= InductorPrecisionChanged;
            ComponentValueBox.ComponentPrecision = SerializableInductor.ComponentPrecision;
            ComponentValueBox.PrecisionChanged += InductorPrecisionChanged;

            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializableInductor.ElementName;
            txtElementName.TextChanged += ElementNameChanged;

            handleInductorModel();
            
            SerializableInductor.PropertyChanged += handleChangeOfControls;
        }

        private void handleInductorModel()
        {
            pnlExponential.Visibility = Visibility.Collapsed;
            pnlParasitic.Visibility = Visibility.Collapsed;

            if (SerializableInductor.InductorModel == 1)
                pnlParasitic.Visibility = Visibility.Visible;

            if (SerializableInductor.InductorModel == 2)
                pnlExponential.Visibility = Visibility.Visible;
        }
        
        private void modelInductorChanged(object sender, SelectionChangedEventArgs e)
        {
            if (!cmbInductorModel.IsDropDownOpen) return;

            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "InductorModel",
                OldValue = int.Parse((string)(e.RemovedItems[0] as ComboBoxItem).Tag),
                NewValue = cmbInductorModel.SelectedIndex
            };

            if (command.OldValue == command.NewValue) return;

            executeCommand(command);

            handleInductorModel();
            
        }

        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }

        private void InductorValueChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "InductorValue",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }

        private void ChangeRs(object sender, ValueChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "Rs",
                OldValue = e.oldValue,
                NewValue = e.newValue
            };

            executeCommand(command);
        }
        
        private void ChangeFo(object sender, ValueChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "Fo",
                OldValue = e.oldValue,
                NewValue = e.newValue
            };

            executeCommand(command);
        }

        private void ChangeQ(object sender, ValueChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "Q",
                OldValue = e.oldValue,
                NewValue = e.newValue
            };

            executeCommand(command);
        }

        private void ChangeCp(object sender, ValueChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "Cp",
                OldValue = e.oldValue,
                NewValue = e.newValue
            };

            executeCommand(command);
        }


        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }

        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializableInductor.ElementName;
        }

        private void InductorPrecisionChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "ComponentPrecision",
                OldValue = args.oldValue,
                NewValue = args.newValue,
                CommandType = CommandType.DontCalculate
            };

            executeCommand(command);

        }

        private void ChangeEw(object sender, ValueChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "Ew",
                OldValue = e.oldValue,
                NewValue = e.newValue
            };

            executeCommand(command);
        }


        private void checkedVoltageAcross(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "OutputVoltageAcross",
                OldValue = SerializableInductor.OutputVoltageAcross,
                NewValue = true,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);

        }

        private void uncheckedVoltageAcross(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "OutputVoltageAcross",
                OldValue = SerializableInductor.OutputVoltageAcross,
                NewValue = false,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);
        }

        private void checkedCurrentThrough(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "OutputCurrentThrough",
                OldValue = SerializableInductor.OutputVoltageAcross,
                NewValue = true,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);

        }

        private void uncheckedCurrentThrough(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableInductor,
                Property = "OutputCurrentThrough",
                OldValue = SerializableInductor.OutputVoltageAcross,
                NewValue = false,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);
        }

    }
}
